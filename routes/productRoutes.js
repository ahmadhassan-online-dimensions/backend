import express from "express";
import {
    getProducts,
    addProduct,
    getProductById,
    deleteProduct,
    updateProduct
} from "../controller/productController.js";
import {protect, admin} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getProducts);
router.get("/:id", getProductById);

router.post("/", protect, admin, addProduct);
router.put("/:id", protect, admin, updateProduct);
router.delete("/:id", protect, admin, deleteProduct);

export default router;
