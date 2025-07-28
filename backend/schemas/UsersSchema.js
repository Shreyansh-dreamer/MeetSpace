const {Schema}=require("mongoose");
const mongoose = require('mongoose');
const { Types } = mongoose;

const UsersSchema = mongoose.Schema({
    username:{
        type:String,
    },
    password:{
        type:String,
    },
    email:{
        type:String,
        required:true,
        unique:true,
    },
    googleId:{
        type:String,
    },
    photos:{
        type:String,
    },
    name:{
        type:String,
    }
})

module.exports={UsersSchema}