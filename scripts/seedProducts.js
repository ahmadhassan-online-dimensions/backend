// Adds the two landing-page products if they are missing:  npm run seed
import "dotenv/config";
import dns from "dns";
import mongoose from "mongoose";
import Product from "../Model/product.js";

dns.setDefaultResultOrder("ipv4first");
dns.setServers((process.env.DNS_SERVERS || "8.8.8.8,1.1.1.1").split(",").map((s) => s.trim()));

// Optional: TWOCHECKOUT_CODE_MODEL_01 / TWOCHECKOUT_CODE_MODEL_02 = product codes from the 2Checkout panel
const CODES = {
    "Model 01": process.env.TWOCHECKOUT_CODE_MODEL_01,
    "Model 02": process.env.TWOCHECKOUT_CODE_MODEL_02
};

const PRODUCTS = [
    {
        name: "Model 01",
        description: "Wearable Eyewear. Opens into eyewear with slender temples that rest on the ears. The signature piece.",
        price: 9800,
        category: "wearable-eyewear",
        stock: 25
    },
    {
        name: "Model 02",
        description: "Handheld Eyewear. Opens into a lens held gracefully to the eyes, then closes, and becomes jewelry again.",
        price: 6900,
        category: "handheld-eyewear",
        stock: 25
    }
];

await mongoose.connect(process.env.MONGOURL);

for (const p of PRODUCTS) {
    const exists = await Product.findOne({ name: p.name });
    const code = CODES[p.name];
    if (exists) {
        if (code && exists.checkoutCode !== code) {
            exists.checkoutCode = code;
            await exists.save();
            console.log(`${p.name}: checkout code set`);
        } else {
            console.log(`${p.name}: already exists, skipped`);
        }
    } else {
        await Product.create({ ...p, checkoutCode: code });
        console.log(`${p.name}: created`);
    }
}

await mongoose.disconnect();
