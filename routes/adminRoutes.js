import express from "express";
import {
    getStats,
    listOrders,
    updateOrder,
    listSubscribers,
    setUserAdmin
} from "../controller/adminController.js";
import {protect, admin} from "../middleware/authMiddleware.js";

const router = express.Router();

// every admin route needs a valid login AND isAdmin
router.use(protect, admin);

router.get("/stats", getStats);
router.get("/orders", listOrders);
router.put("/orders/:id", updateOrder);
router.get("/subscribers", listSubscribers);
router.put("/users/:id/admin", setUserAdmin);

export default router;
