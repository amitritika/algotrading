const express = require("express");
const router = express.Router();

const { niftyPE, buyOrderStrategy5emaPE, sellOrderStrategy5emaPE, squareOffOrderStrategy5emaPE, clearTheIntradayStatusPE,
    trailingSLStrategy5emaPE } = require("../controllers/emaStrategy");
router.get("/niftyPE", niftyPE);

router.get("/buyOrderStrategy5emaPE", buyOrderStrategy5emaPE);
router.get("/sellOrderStrategy5emaPE", sellOrderStrategy5emaPE);
router.get("/squareOffOrderStrategy5emaPE", squareOffOrderStrategy5emaPE);
router.get("/clearTheIntradayStatusPE", clearTheIntradayStatusPE);
router.get("/trailingSLStrategy5emaPE", trailingSLStrategy5emaPE);

module.exports = router;