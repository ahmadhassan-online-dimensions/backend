import express from "express";
import { subscribe } from "../controller/newsletterController.js";

const router = express.Router();

router.post("/", subscribe);

export default router;
