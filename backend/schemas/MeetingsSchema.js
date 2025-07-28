const mongoose = require("mongoose");

const MeetingsSchema = mongoose.Schema({
    name:{
        type:String,
        required:true,
    },
    day:{
        type:Date,
        required:true,
    },
    time:{
        type:String,
        required:true,
        match:/^([0-1]\d|2[0-3]):([0-5]\d)$/,
    },
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
    }
})

module.exports={MeetingsSchema}