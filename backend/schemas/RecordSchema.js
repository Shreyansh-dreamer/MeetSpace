const mongoose = require("mongoose");

const RecordSchema = mongoose.Schema({
    name:{
        type:String,
        required:true,
    },
    duration:{
        type:String,
        required:true,
    },
    link:{
        type:String,
        required:true,
    },
    size:{
        type:String,
        required:true,
    },
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
    },
    createdAt: { type: Date, default: Date.now, index: { expires: '1d' } }
});

module.exports ={RecordSchema};
