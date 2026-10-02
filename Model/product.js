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
    }

},{
    timestamps:true
})

const Product = mongoose.model("Product",productschema);

export default Product;
