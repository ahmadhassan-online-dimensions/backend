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
import {protect} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.get("/profile", protect, getProfile);

router.get("/", protect, getUsers);
router.get("/:id", protect, getUserById);
router.put("/:id", protect, updateUser);
router.delete("/:id", protect, deleteUser);

export default router;
