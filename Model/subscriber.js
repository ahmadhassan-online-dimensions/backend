import mongoose from "mongoose";

const subscriberSchema = mongoose.Schema({

    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        match:[/^\S+@\S+\.\S+$/, "Invalid email address"]
    }

},{
    timestamps:true
})

const Subscriber = mongoose.model("Subscriber",subscriberSchema);

export default Subscriber;
