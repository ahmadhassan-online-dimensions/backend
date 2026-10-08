import express from "express";
import {
    getUsers,
    getUserById,
    deleteUser,
    updateUser,
    registerUser,
    loginUser,
    logoutUser,
    getProfile
} from "../controller/userController.js";
import {googleLogin, appleLogin} from "../controller/socialAuthController.js";
import {protect, admin} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.post("/google", googleLogin);
router.post("/apple", appleLogin);
router.get("/profile", protect, getProfile);

router.get("/", protect, admin, getUsers);
router.get("/:id", protect, getUserById);
router.put("/:id", protect, updateUser);
router.delete("/:id", protect, deleteUser);

export default router;
