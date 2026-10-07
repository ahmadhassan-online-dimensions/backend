import expressAsyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Cart from "../Model/cart.js";
import Order from "../Model/order.js";
import { buildBuyLink, isConfigured } from "../utils/twoCheckout.js";

const round2 = (n) => Math.round(n * 100) / 100;

const REQUIRED_ADDRESS = ["fullName", "address", "city", "country"];

const assertPaymentConfigured = (res) => {
    if (!isConfigured()) {
        res.status(503);
        throw new Error("Payment gateway is not configured");
    }
};


// POST /api/orders/checkout
// Turns the cart into a pending order and returns the 2Checkout payment URL.
export const checkout = expressAsyncHandler(async (req, res) => {

    assertPaymentConfigured(res);

    const shippingAddress = req.body.shippingAddress || {};

    const missing = REQUIRED_ADDRESS.filter((f) => !shippingAddress[f]);
    if (missing.length) {
        res.status(400);
        throw new Error(`shippingAddress is missing: ${missing.join(", ")}`);
    }

    const cart = await Cart.findOne({ user: req.user._id }).populate("items.product");
    const lines = (cart?.items || []).filter((i) => i.product);

    if (lines.length === 0) {
        res.status(400);
        throw new Error("Cart is empty");
    }

    for (const line of lines) {
        if (line.product.stock < line.quantity) {
            res.status(400);
            throw new Error(`Only ${line.product.stock} in stock for "${line.product.name}"`);
        }
    }

    const items = lines.map((l) => ({
        product: l.product._id,
        name: l.product.name,
        price: l.product.price,
        quantity: l.quantity,
        checkoutCode: l.product.checkoutCode
    }));

    const order = await Order.create({
        user: req.user._id,
        items,
        shippingAddress,
        totalAmount: round2(items.reduce((sum, i) => sum + i.price * i.quantity, 0)),
        currency: process.env.PAYMENT_CURRENCY || "USD"
    });

    res.status(201).json({
        status: "OK",
        message: "Order Created. Open paymentUrl to pay.",
        order,
        paymentUrl: buildBuyLink(order, req.user)
    });
});


// POST /api/orders/:id/pay  - new payment link for a still-pending order
export const payOrder = expressAsyncHandler(async (req, res) => {

    assertPaymentConfigured(res);

    const order = await findOwnOrder(req, res);

    if (order.status !== "pending") {
        res.status(400);
        throw new Error(`Order is already ${order.status}`);
    }

    res.json({
        status: "OK",
        message: "Payment Link Generated",
        order,
        paymentUrl: buildBuyLink(order, req.user)
    });
});


export const getMyOrders = expressAsyncHandler(async (req, res) => {

    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });

    res.json({
        status: "OK",
        message: "Orders Retrieved",
        orders
    });
});


export const getOrderById = expressAsyncHandler(async (req, res) => {

    const order = await findOwnOrder(req, res);

    res.json({
        status: "OK",
        message: "Order Retrieved",
        order
    });
});


async function findOwnOrder(req, res) {

    if (!mongoose.isValidObjectId(req.params.id)) {
        res.status(400);
        throw new Error("Invalid order id");
    }

    const order = await Order.findById(req.params.id);

    // 404 (not 403) so order ids of other users aren't revealed
    if (!order || order.user.toString() !== req.user._id.toString()) {
        res.status(404);
        throw new Error("Order not found");
    }

    return order;
}
