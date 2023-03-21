const express = require("express");
const router = express.Router();

const { createNifty100, createTradeStatus, createInstruments, getInstrument } = require("../controllers/stockListCreation");

router.get("/createNifty100", createNifty100);
router.get("/createTradeStatus/:id", createTradeStatus);

router.get("/createInstruments", createInstruments);
router.get("/getInstrument/:id", getInstrument);

module.exports = router;