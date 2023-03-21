const mongoose = require("mongoose");

const tradeStatusSchema = new mongoose.Schema({
    name:{
        type: String,
        unique: true
    },
    status: {
        type: Boolean,
        default: false
    },
    token: {
        type: String
    },
    symbol: {
        type: String
    },
    type: {
        type: String,
        default: "sideways"
    },
    data: {
        type: Object,
        default: {}
    }
});

module.exports = mongoose.model("TradeStatus", tradeStatusSchema);