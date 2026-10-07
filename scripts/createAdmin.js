// Creates (or resets) the admin account:   npm run create-admin
//
//   ADMIN_EMAIL=you@site.com ADMIN_PASSWORD=...  npm run create-admin     (your own values)
//   npm run create-admin                                                  (random password)
//
// A generated password is written to ADMIN_CREDENTIALS.txt (git-ignored), never printed.
import "dotenv/config";
import crypto from "crypto";
import dns from "dns";
import fs from "fs";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../Model/user.js";

dns.setDefaultResultOrder("ipv4first");
dns.setServers((process.env.DNS_SERVERS || "8.8.8.8,1.1.1.1").split(",").map((s) => s.trim()));

const email = (process.env.ADMIN_EMAIL || "admin@jewels.online-dimensions.com").toLowerCase().trim();
const generated = !process.env.ADMIN_PASSWORD;
const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(12).toString("base64url");

if (password.length < 8) {
    console.error("ADMIN_PASSWORD must be at least 8 characters");
    process.exit(1);
}

await mongoose.connect(process.env.MONGOURL);

const hash = await bcrypt.hash(password, 10);
const existing = await User.findOne({ email });

if (existing) {
    existing.password = hash;
    existing.isAdmin = true;
    await existing.save();
    console.log(`Admin ${email}: password reset, admin access on`);
} else {
    await User.create({ name: "Administrator", email, password: hash, isAdmin: true });
    console.log(`Admin ${email}: created`);
}

if (generated) {
    fs.writeFileSync(
        "ADMIN_CREDENTIALS.txt",
        `Admin panel login\nURL:      /admin\nEmail:    ${email}\nPassword: ${password}\n\nChange this password after first login, then delete this file.\n`
    );
    console.log("Generated password saved to ADMIN_CREDENTIALS.txt");
}

await mongoose.disconnect();
