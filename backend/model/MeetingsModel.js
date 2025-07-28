const {model}=require("mongoose");

const {MeetingsSchema}=require('../schemas/MeetingsSchema');

const MeetingsModel = model("Meetings", MeetingsSchema);

module.exports = { MeetingsModel };