const express = require("express");
const router = express.Router();

const { getDailyDataAnalysis, get15MinuteDataAnalysis, 
    get30MinuteDataAnalysis, get5MinuteDataAnalysis, get60MinuteDataAnalysis } = require("../controllers/historicalDataAnalysis");

router.get("/getDailyDataAnalysis", getDailyDataAnalysis);
router.get("/get15MinuteDataAnalysis", get15MinuteDataAnalysis);
router.get("/get5MinuteDataAnalysis", get5MinuteDataAnalysis);
router.get("/get30MinuteDataAnalysis", get30MinuteDataAnalysis);
router.get("/get60MinuteDataAnalysis", get60MinuteDataAnalysis);

module.exports = router;