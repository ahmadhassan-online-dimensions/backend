import express from "express";
import {
    getProducts,
    addProduct,
    getProductById,
    deleteProduct,
    updateProduct
} from "../controller/productController.js";
import {protect} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getProducts);
router.get("/:id", getProductById);

router.post("/", protect, addProduct);
router.put("/:id", protect, updateProduct);
router.delete("/:id", protect, deleteProduct);

export default router;
