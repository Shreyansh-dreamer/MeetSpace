const {model}=require("mongoose");

const {RecordSchema}=require('../schemas/RecordSchema');

const RecordsModel = model("Records", RecordSchema);

module.exports = { RecordsModel };