import expressAsyncHandler from "express-async-handler";
import Product from "../Model/product.js";


export const getProducts = expressAsyncHandler(async (req, res) => {

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);

    const filter = {};
    if (req.query.category) filter.category = req.query.category;

    const [products, total] = await Promise.all([
        Product.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
        Product.countDocuments(filter)
    ]);

    res.json({
        status: "OK",
        message: "Products Retrieved",
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        products: products
    });
});


export const addProduct = expressAsyncHandler(async (req, res) => {

    const { name, description, price, category, stock, checkoutCode } = req.body;

    const product = await Product.create({ name, description, price, category, stock, checkoutCode });

    res.status(201).json({
        status: "OK",
        message: "Product Added",
        product
    });
});


export const getProductById = expressAsyncHandler(async (req, res) => {

    const product = await Product.findById(req.params.id);

    if (!product) {
        res.status(404);
        throw new Error("Product not found");
    }

    res.json({
        status: "OK",
        message: "Product Retrieved Successfully",
        product: product
    });
});


export const deleteProduct = expressAsyncHandler(async (req, res) => {

    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
        res.status(404);
        throw new Error("No Product Found!");
    }

    res.json({
        status: "OK",
        message: "Product Deleted Successfully"
    });
});


export const updateProduct = expressAsyncHandler(async (req, res) => {

    const product = await Product.findById(req.params.id);

    if (!product) {
        res.status(404);
        throw new Error("Product not found");
    }

    product.name = req.body.name ?? product.name;
    product.description = req.body.description ?? product.description;
    product.price = req.body.price ?? product.price;
    product.category = req.body.category ?? product.category;
    product.stock = req.body.stock ?? product.stock;
    product.checkoutCode = req.body.checkoutCode ?? product.checkoutCode;

    const updatedProduct = await product.save();

    res.json({
        status: "OK",
        message: "Product Updated Successfully",
        product: updatedProduct
    });
});
