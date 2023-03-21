const mongoose = require("mongoose");

const nifty100Schema = new mongoose.Schema({
    name: {
        type: String
    },
    token: {
        type: String,
        unique: true
    },
    symbol: {
        type: String
    },
    type: {
        type: String,
        default: "sideways"
    },
    strategyTyep: {
        type: Object,
        default: {}
    },
    monthlyData:{
        type: Object,
        default: {}
    },
    weeklyData:{
        type: Object,
        default: {}
    },
    dailyData:{
        type: Object,
        default: {}
    },
    hourlyData:{
        type: Object,
        default: {}
    },
    thirtyMinData:{
        type: Object,
        default: {}
    },
    fifteenMinData:{
        type: Object,
        default: {}
    },
    fiveMinData:{
        type: Object,
        default: {}
    },
    data: {
        type: Object,
        default: {}
    }
});

module.exports = mongoose.model("Nifty100", nifty100Schema);