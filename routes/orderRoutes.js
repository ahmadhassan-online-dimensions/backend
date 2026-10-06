import express from "express";
import {
    checkout,
    payOrder,
    getMyOrders,
    getOrderById
} from "../controller/orderController.js";
import {protect} from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/checkout", checkout);
router.get("/", getMyOrders);
router.get("/:id", getOrderById);
router.post("/:id/pay", payOrder);

export default router;
