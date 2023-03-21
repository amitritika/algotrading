const mongoose = require("mongoose");

const instrumentsSchema = new mongoose.Schema({
    token: {
        type: String,
    },
    symbol: {
        type: String,
    },
    name: {
        type: String
    },
    expiry: {
        type: String
    },
    strike: {
        type: String
    },
    lotsize: {
        type: String
    },
    instrumenttype: {
        type: String
    },
    exch_seg: {
        type: String
    },
    tick_size: {
        type: String
    }
    
});

module.exports = mongoose.model("Instruments", instrumentsSchema);