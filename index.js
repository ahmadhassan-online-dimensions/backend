import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import userRoutes from "./routes/userRoutes.js";
import productRoutes from "./routes/productRoutes.js"
import {errorHandler, notFound} from "./middleware/errorMiddleware.js";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "OK" }));

app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);

app.use(notFound);
app.use(errorHandler);

const url = process.env.MONGOURL;

mongoose.connect(url)
.then(() => console.log("Connected With Mongo DB"))
.catch((e) => console.log("DB ERROR = "+e));

// 0.0.0.0 so phones / emulators on the same network can reach it
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
