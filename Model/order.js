import mongoose from "mongoose";

const orderSchema = mongoose.Schema({

    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },

    // price/name are copied at checkout so later product edits don't change the order
    items:[{
        product:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Product",
            required:true
        },
        name:{ type:String, required:true },
        price:{ type:Number, required:true },
        quantity:{ type:Number, required:true, min:1 },
        checkoutCode:{ type:String }
    }],

    shippingAddress:{
        fullName:{ type:String, required:true },
        phone:{ type:String },
        address:{ type:String, required:true },
        city:{ type:String, required:true },
        state:{ type:String },
        postalCode:{ type:String },
        country:{ type:String, required:true }
    },

    totalAmount:{
        type:Number,
        required:true
    },

    currency:{
        type:String,
        required:true
    },

    status:{
        type:String,
        enum:["pending","paid","cancelled"],
        default:"pending"
    },

    paymentProvider:{
        type:String,
        default:"2checkout"
    },

    paymentRef:{ type:String },
    paidAt:{ type:Date }

},{
    timestamps:true
})

const Order = mongoose.model("Order",orderSchema);

export default Order;
