import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
// Node's own resolver can fail SRV lookups (mongodb+srv://) with ECONNREFUSED when the
// system DNS is a local stub; use public DNS for it. Override with DNS_SERVERS=ip,ip
dns.setServers((process.env.DNS_SERVERS || "8.8.8.8,1.1.1.1").split(",").map((s) => s.trim()));
import userRoutes from "./routes/userRoutes.js";
import productRoutes from "./routes/productRoutes.js"
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import newsletterRoutes from "./routes/newsletterRoutes.js";
import {errorHandler, notFound} from "./middleware/errorMiddleware.js";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
// 2Checkout IPN notifications are form-encoded
app.use(express.urlencoded({ extended: false }));

app.get("/api/health", (req, res) => res.json({ status: "OK" }));

app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/newsletter", newsletterRoutes);

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
