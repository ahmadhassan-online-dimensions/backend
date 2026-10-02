import expressAsyncHandler from "express-async-handler";
import User from "../Model/user.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const signToken = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

const isOwnerOrAdmin = (req) =>
    req.user.isAdmin || req.user._id.toString() === req.params.id;


export const getUsers = expressAsyncHandler(async (req, res) => {

    const users = await User.find();

    res.json({
        status: "OK",
        message: "Users Retrieved",
        users: users
    });
});


export const getUserById = expressAsyncHandler(async (req, res) => {

    if (!isOwnerOrAdmin(req)) {
        res.status(403);
        throw new Error("Forbidden");
    }

    const user = await User.findById(req.params.id);

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    res.json({
        status: "OK",
        message: "User Retrieved Successfully",
        user: user
    });
});


export const deleteUser = expressAsyncHandler(async (req, res) => {

    if (!isOwnerOrAdmin(req)) {
        res.status(403);
        throw new Error("Forbidden");
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
        res.status(404);
        throw new Error("No User Found!");
    }

    res.json({
        status: "OK",
        message: "User Deleted Successfully"
    });
});


export const updateUser = expressAsyncHandler(async (req, res) => {

    if (!isOwnerOrAdmin(req)) {
        res.status(403);
        throw new Error("Forbidden");
    }

    const user = await User.findById(req.params.id);

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    user.name = req.body.name ?? user.name;
    user.email = req.body.email ?? user.email;

    if (req.body.password) {
        if (req.body.password.length < 6) {
            res.status(400);
            throw new Error("Password must be at least 6 characters");
        }
        user.password = await bcrypt.hash(req.body.password, 10);
    }

    const updatedUser = await user.save();

    res.json({
        status: "OK",
        message: "User Updated Successfully",
        user: updatedUser
    });
});


export const registerUser = expressAsyncHandler(async (req, res) => {

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        res.status(400);
        throw new Error("name, email and password are required");
    }

    if (typeof password !== "string" || password.length < 6) {
        res.status(400);
        throw new Error("Password must be at least 6 characters");
    }

    const userExists = await User.findOne({ email: String(email).toLowerCase().trim() });

    if (userExists) {
        res.status(409);
        throw new Error("User Already Exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // isAdmin is never taken from the request body
    const user = await User.create({
        name,
        email,
        password: hashedPassword
    });

    res.status(201).json({
        status: "OK",
        message: "User Registered",
        token: signToken(user._id),
        user: user
    });
});


export const loginUser = expressAsyncHandler(async (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400);
        throw new Error("email and password are required");
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select("+password");

    if (user && await bcrypt.compare(password, user.password)) {
        res.json({
            status: "OK",
            message: "Login Successful",
            token: signToken(user._id),
            user: user
        });
    } else {
        res.status(401);
        throw new Error("Invalid Email Or Password");
    }
});


export const getProfile = expressAsyncHandler(async (req, res) => {

    res.json({
        status: "OK",
        message: "Profile Retrieved",
        user: req.user
    });
});


export const logoutUser = expressAsyncHandler(async (req, res) => {

    // JWTs are stateless: the client discards the token
    res.json({
        status: "OK",
        message: "Logout Successful"
    });
});
