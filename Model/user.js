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

    // accounts created with Google / Apple have no password
    password:{
        type:String,
        required:function () { return !this.googleId && !this.appleId; },
        select:false
    },

    // the provider's stable user id ("sub" claim), used to recognise the same person next time
    googleId:{
        type:String,
        unique:true,
        sparse:true,
        select:false
    },

    appleId:{
        type:String,
        unique:true,
        sparse:true,
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
            delete ret.googleId;
            delete ret.appleId;
            delete ret.__v;
            return ret;
        }
    }
})

const User = mongoose.model("User",userSchema);

export default User;
