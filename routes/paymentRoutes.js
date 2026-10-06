import express from "express";
import {
    handleIpn,
    paymentReturn
} from "../controller/paymentController.js";

const router = express.Router();

// public on purpose: 2Checkout calls these. The IPN is authenticated by its HMAC signature.
router.post("/2checkout/ipn", handleIpn);
router.get("/return", paymentReturn);

export default router;
