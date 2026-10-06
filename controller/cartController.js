import expressAsyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Cart from "../Model/cart.js";
import Product from "../Model/product.js";

const round2 = (n) => Math.round(n * 100) / 100;

const formatCart = (cart) => {
    const items = (cart?.items || [])
        .filter((i) => i.product)
        .map((i) => ({
            product: i.product,
            quantity: i.quantity,
            lineTotal: round2(i.product.price * i.quantity)
        }));

    return {
        items,
        totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
        totalAmount: round2(items.reduce((sum, i) => sum + i.lineTotal, 0))
    };
};

const loadCart = (userId) =>
    Cart.findOne({ user: userId }).populate("items.product");

const parseQuantity = (res, value) => {
    const quantity = Number(value);
    if (!Number.isInteger(quantity) || quantity < 1) {
        res.status(400);
        throw new Error("quantity must be a whole number of at least 1");
    }
    return quantity;
};

const assertValidProductId = (res, id) => {
    if (!mongoose.isValidObjectId(id)) {
        res.status(400);
        throw new Error("Invalid productId");
    }
};

const assertStock = (res, product, quantity) => {
    if (product.stock < quantity) {
        res.status(400);
        throw new Error(`Only ${product.stock} in stock for "${product.name}"`);
    }
};


export const getCart = expressAsyncHandler(async (req, res) => {

    const cart = await loadCart(req.user._id);

    res.json({
        status: "OK",
        message: "Cart Retrieved",
        cart: formatCart(cart)
    });
});


export const addToCart = expressAsyncHandler(async (req, res) => {

    const { productId } = req.body;
    const quantity = parseQuantity(res, req.body.quantity ?? 1);

    assertValidProductId(res, productId);

    const product = await Product.findById(productId);

    if (!product) {
        res.status(404);
        throw new Error("Product not found");
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
        cart = new Cart({ user: req.user._id, items: [] });
    }

    const existing = cart.items.find((i) => i.product.toString() === productId);
    const newQuantity = (existing ? existing.quantity : 0) + quantity;

    assertStock(res, product, newQuantity);

    if (existing) {
        existing.quantity = newQuantity;
    } else {
        cart.items.push({ product: productId, quantity });
    }

    await cart.save();

    res.status(201).json({
        status: "OK",
        message: "Added To Cart",
        cart: formatCart(await loadCart(req.user._id))
    });
});


export const updateCartItem = expressAsyncHandler(async (req, res) => {

    const { productId } = req.params;
    const quantity = parseQuantity(res, req.body.quantity);

    assertValidProductId(res, productId);

    const cart = await Cart.findOne({ user: req.user._id });
    const item = cart?.items.find((i) => i.product.toString() === productId);

    if (!item) {
        res.status(404);
        throw new Error("Item not in cart");
    }

    const product = await Product.findById(productId);

    if (!product) {
        res.status(404);
        throw new Error("Product not found");
    }

    assertStock(res, product, quantity);

    item.quantity = quantity;
    await cart.save();

    res.json({
        status: "OK",
        message: "Cart Updated",
        cart: formatCart(await loadCart(req.user._id))
    });
});


export const removeFromCart = expressAsyncHandler(async (req, res) => {

    const { productId } = req.params;

    assertValidProductId(res, productId);

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart || !cart.items.some((i) => i.product.toString() === productId)) {
        res.status(404);
        throw new Error("Item not in cart");
    }

    cart.items = cart.items.filter((i) => i.product.toString() !== productId);
    await cart.save();

    res.json({
        status: "OK",
        message: "Removed From Cart",
        cart: formatCart(await loadCart(req.user._id))
    });
});


export const clearCart = expressAsyncHandler(async (req, res) => {

    await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });

    res.json({
        status: "OK",
        message: "Cart Cleared",
        cart: formatCart(null)
    });
});
