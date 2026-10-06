import expressAsyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Cart from "../Model/cart.js";
import Order from "../Model/order.js";
import Product from "../Model/product.js";
import { verifyIpn, buildIpnAck } from "../utils/twoCheckout.js";

const PAID_STATUSES = ["COMPLETE"];
const CANCELLED_STATUSES = ["CANCELED", "CANCELLED", "REVERSED", "REFUND", "REFUNDED"];


// POST /api/payments/2checkout/ipn  (called by 2Checkout, not by the app)
export const handleIpn = expressAsyncHandler(async (req, res) => {

    const secretKey = process.env.TWOCHECKOUT_SECRET_KEY;
    const body = req.body;

    if (!verifyIpn(body, secretKey)) {
        res.status(401);
        throw new Error("Invalid IPN signature");
    }

    const orderId = body.REFNOEXT;

    if (!mongoose.isValidObjectId(orderId)) {
        res.status(400);
        throw new Error("Unknown order reference");
    }

    const order = await Order.findById(orderId);

    if (!order) {
        res.status(404);
        throw new Error("Order not found");
    }

    const orderStatus = String(body.ORDERSTATUS || "").toUpperCase();

    if (PAID_STATUSES.includes(orderStatus) && order.status === "pending") {

        // claim the transition atomically so a repeated IPN can't process twice
        const claimed = await Order.findOneAndUpdate(
            { _id: order._id, status: "pending" },
            { status: "paid", paidAt: new Date(), paymentRef: body.REFNO || body.ORDERNO }
        );

        if (claimed) {
            for (const item of order.items) {
                await Product.updateOne(
                    { _id: item.product, stock: { $gte: item.quantity } },
                    { $inc: { stock: -item.quantity } }
                );
            }
            await Cart.findOneAndUpdate({ user: order.user }, { items: [] });
        }

    } else if (CANCELLED_STATUSES.includes(orderStatus) && order.status === "pending") {
        await Order.updateOne({ _id: order._id, status: "pending" }, { status: "cancelled" });
    }

    res.type("text/plain").send(buildIpnAck(body, secretKey));
});


// GET /api/payments/return  - page shown in the WebView/browser after paying.
// The app should detect this URL and then fetch GET /api/orders/:id for the real status.
export const paymentReturn = (req, res) => {
    res.type("html").send(
        `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">` +
        `<body style="font-family:sans-serif;text-align:center;padding:48px">` +
        `<h2>Thank you!</h2><p>Your payment is being confirmed. You can return to the app.</p></body>`
    );
};
