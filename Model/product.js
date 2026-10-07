import mongoose from "mongoose";

const productschema = mongoose.Schema({

    name:{
        type:String,
        required:true,
        trim:true
    },

    description:{
        type:String,
        required:true
    },

    price:{
        type:Number,
        required:true,
        min:0
    },

    category:{
        type:String,
        trim:true
    },

    stock:{
        type:Number,
        default:0,
        min:0
    },

    // product code created in the 2Checkout panel (Setup > Products); enables catalog checkout
    checkoutCode:{
        type:String,
        trim:true
    }

},{
    timestamps:true
})

const Product = mongoose.model("Product",productschema);

export default Product;
