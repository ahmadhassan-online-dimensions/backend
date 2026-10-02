import jwt from "jsonwebtoken";
import expressAsyncHandler from "express-async-handler";
import User from "../Model/user.js";

export const protect = expressAsyncHandler(async (req, res, next) => {

    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
        res.status(401);
        throw new Error("Not Authorized");
    }

    const token = header.split(" ")[1];

    // invalid / expired tokens throw and are mapped to 401 by the error handler
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (!user) {
        res.status(401);
        throw new Error("Not Authorized");
    }

    req.user = user;
    next();
});

export const admin = (req, res, next) => {
    if (req.user && req.user.isAdmin) {
        return next();
    }
    res.status(403);
    next(new Error("Admin access required"));
};
