import expressAsyncHandler from "express-async-handler";
import Subscriber from "../Model/subscriber.js";

export const subscribe = expressAsyncHandler(async (req, res) => {

    const email = String(req.body.email || "").toLowerCase().trim();

    if (!email) {
        res.status(400);
        throw new Error("email is required");
    }

    // subscribing twice is not an error: same friendly answer either way
    const existing = await Subscriber.findOne({ email });
    if (!existing) {
        await Subscriber.create({ email });
    }

    res.status(201).json({
        status: "OK",
        message: "Thank you, you're subscribed."
    });
});
