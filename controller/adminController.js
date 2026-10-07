import expressAsyncHandler from "express-async-handler";
import mongoose from "mongoose";
import User from "../Model/user.js";
import Product from "../Model/product.js";
import Order from "../Model/order.js";
import Subscriber from "../Model/subscriber.js";

const FULFILLMENT = ["processing", "shipped", "delivered"];


// GET /api/admin/stats
export const getStats = expressAsyncHandler(async (req, res) => {

    const [users, products, orders, paidOrders, pendingOrders, subscribers, lowStock, revenue, recent] =
        await Promise.all([
            User.countDocuments(),
            Product.countDocuments(),
            Order.countDocuments(),
            Order.countDocuments({ status: "paid" }),
            Order.countDocuments({ status: "pending" }),
            Subscriber.countDocuments(),
            Product.find({ stock: { $lte: 5 } }).select("name stock").sort({ stock: 1 }).limit(10),
            Order.aggregate([
                { $match: { status: "paid" } },
                { $group: { _id: "$currency", total: { $sum: "$totalAmount" } } }
            ]),
            Order.find().sort({ createdAt: -1 }).limit(5).populate("user", "name email")
        ]);

    res.json({
        status: "OK",
        stats: {
            users, products, orders, paidOrders, pendingOrders, subscribers,
            revenue: revenue.map((r) => ({ currency: r._id, total: r.total })),
            lowStock,
            recent
        }
    });
});


// GET /api/admin/orders?status=paid&page=1&limit=20
export const listOrders = expressAsyncHandler(async (req, res) => {

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);

    const filter = {};
    if (["pending", "paid", "cancelled"].includes(req.query.status)) filter.status = req.query.status;

    const [orders, total] = await Promise.all([
        Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("user", "name email"),
        Order.countDocuments(filter)
    ]);

    res.json({
        status: "OK",
        page, limit, total,
        totalPages: Math.ceil(total / limit),
        orders
    });
});


// PUT /api/admin/orders/:id   { fulfillment }
export const updateOrder = expressAsyncHandler(async (req, res) => {

    if (!mongoose.isValidObjectId(req.params.id)) {
        res.status(400);
        throw new Error("Invalid order id");
    }

    const { fulfillment } = req.body;

    if (!FULFILLMENT.includes(fulfillment)) {
        res.status(400);
        throw new Error(`fulfillment must be one of: ${FULFILLMENT.join(", ")}`);
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
        res.status(404);
        throw new Error("Order not found");
    }

    order.fulfillment = fulfillment;
    await order.save();

    res.json({ status: "OK", message: "Order Updated", order });
});


// GET /api/admin/subscribers
export const listSubscribers = expressAsyncHandler(async (req, res) => {

    const subscribers = await Subscriber.find().sort({ createdAt: -1 }).limit(500);

    res.json({ status: "OK", subscribers });
});


// PUT /api/admin/users/:id/admin   { isAdmin }
export const setUserAdmin = expressAsyncHandler(async (req, res) => {

    if (!mongoose.isValidObjectId(req.params.id)) {
        res.status(400);
        throw new Error("Invalid user id");
    }

    if (req.params.id === req.user._id.toString()) {
        res.status(400);
        throw new Error("You cannot change your own admin access");
    }

    const user = await User.findById(req.params.id);

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    user.isAdmin = Boolean(req.body.isAdmin);
    await user.save();

    res.json({ status: "OK", message: "User Updated", user });
});
