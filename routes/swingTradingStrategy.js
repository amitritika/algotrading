const express = require("express");
const router = express.Router();

const { rsiM60W60D40Suppot, rsiD60H6015Min40Suppot } = require("../controllers/swingTradingStrategy");

router.get("/rsiM60W60D40Suppot", rsiM60W60D40Suppot);
router.get("/rsiD60H6015Min40Suppot", rsiD60H6015Min40Suppot);

module.exports = router;