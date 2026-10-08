import expressAsyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { createRemoteJWKSet, jwtVerify } from "jose";
import User from "../Model/user.js";

// Sign in with Google / Apple. The app (web or mobile) gets an ID token from the provider and
// sends it here; we verify it with the provider's public keys, then log the person in.
//
//   GOOGLE_CLIENT_ID  one or more OAuth client ids, comma separated (web, iOS, Android ...)
//   APPLE_CLIENT_ID   one or more Services IDs / bundle ids, comma separated (web, iOS app ...)

const list = (value) => (value || "").split(",").map((s) => s.trim()).filter(Boolean);

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

const googleClient = new OAuth2Client();
const appleKeys = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

const notConfigured = (res, what) => {
    res.status(503);
    throw new Error(`${what} sign-in is not configured on the server`);
};

const invalidToken = (res, what) => {
    res.status(401);
    throw new Error(`Could not verify your ${what} sign-in. Please try again.`);
};

const isTrue = (v) => v === true || v === "true";

// Find the account for this provider identity, or link / create one.
// Exported so it can be tested without a real provider token.
export async function findOrCreateSocialUser(provider, subject, email, name) {

    const field = provider === "google" ? "googleId" : "appleId";
    email = email ? String(email).toLowerCase().trim() : "";

    // 1. returning user
    let user = await User.findOne({ [field]: subject });
    if (user) return user;

    // 2. same verified email already has an account: attach this provider to it
    if (email) {
        user = await User.findOne({ email });
        if (user) {
            user[field] = subject;
            await user.save();
            return user;
        }
    }

    // 3. brand new account
    if (!email) {
        const err = new Error("Your account did not share an email address, so we could not create your profile");
        err.status = 400;
        throw err;
    }

    return User.create({
        name: (name && name.trim()) || email.split("@")[0],
        email,
        [field]: subject
    });
}

const reply = (res, user, message) =>
    res.json({
        status: "OK",
        message,
        token: signToken(user._id),
        user
    });


// POST /api/users/google   { credential }   (the ID token from Google)
export const googleLogin = expressAsyncHandler(async (req, res) => {

    const audience = list(process.env.GOOGLE_CLIENT_ID);
    if (audience.length === 0) notConfigured(res, "Google");

    const { credential } = req.body;
    if (!credential || typeof credential !== "string") {
        res.status(400);
        throw new Error("credential is required");
    }

    let payload;
    try {
        const ticket = await googleClient.verifyIdToken({ idToken: credential, audience });
        payload = ticket.getPayload();
    } catch {
        invalidToken(res, "Google");
    }

    if (!payload?.sub || !isTrue(payload.email_verified)) {
        res.status(401);
        throw new Error("Your Google email address is not verified");
    }

    const user = await findOrCreateSocialUser("google", payload.sub, payload.email, payload.name);
    reply(res, user, "Google Sign-in Successful");
});


// POST /api/users/apple   { idToken, name? }   (name is only sent by Apple the first time)
export const appleLogin = expressAsyncHandler(async (req, res) => {

    const audience = list(process.env.APPLE_CLIENT_ID);
    if (audience.length === 0) notConfigured(res, "Apple");

    const { idToken, name } = req.body;
    if (!idToken || typeof idToken !== "string") {
        res.status(400);
        throw new Error("idToken is required");
    }

    let payload;
    try {
        ({ payload } = await jwtVerify(idToken, appleKeys, {
            issuer: "https://appleid.apple.com",
            audience
        }));
    } catch {
        invalidToken(res, "Apple");
    }

    // Apple may give a private-relay address (xxxx@privaterelay.appleid.com): that is fine, it forwards mail
    if (payload.email && !isTrue(payload.email_verified)) {
        res.status(401);
        throw new Error("Your Apple email address is not verified");
    }

    const fullName = typeof name === "string" ? name : [name?.firstName, name?.lastName].filter(Boolean).join(" ");

    const user = await findOrCreateSocialUser("apple", payload.sub, payload.email, fullName);
    reply(res, user, "Apple Sign-in Successful");
});
