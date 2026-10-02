import mongoose from "mongoose";

const userSchema = mongoose.Schema({

    name:{
        type:String,
        required:true,
        trim:true
    },

    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        match:[/^\S+@\S+\.\S+$/, "Invalid email address"]
    },

    password:{
        type:String,
        required:true,
        select:false
    },

    isAdmin:{
        type:Boolean,
        default:false
    }

},{
    timestamps:true,
    toJSON:{
        transform:(doc, ret) => {
            delete ret.password;
            delete ret.__v;
            return ret;
        }
    }
})

const User = mongoose.model("User",userSchema);

export default User;
