const express = require("express");
const router = express.Router();

const { getEndOfDay44maDailyData, backtest44maDailyData, backtest44maDailyStrategy, 
    get44maDailyStocks, getEndOf15Min44maAnd200maData, 
    get44ma200ma15MinStocksOrder, get44ma200ma15MinStocksSellOrder, get44ma200ma15MinStocksOrderQuantity,
    get44ma200ma15MinStocksSquareOffOrder, clearTheIntradayStatus } = require("../controllers/historicalData");

router.get("/getEndOfDay44maDailyData", getEndOfDay44maDailyData);
router.get("/getEndOf15Min44maAnd200maData", getEndOf15Min44maAnd200maData);
router.get("/get44ma200ma15MinStocksOrder", get44ma200ma15MinStocksOrder);
router.get("/get44ma200ma15MinStocksOrderQuantity", get44ma200ma15MinStocksOrderQuantity);
router.get("/get44ma200ma15MinStocksSellOrder", get44ma200ma15MinStocksSellOrder);
router.get("/get44ma200ma15MinStocksSquareOffOrder", get44ma200ma15MinStocksSquareOffOrder);
router.get("/clearTheIntradayStatus", clearTheIntradayStatus);

router.get("/backtest44maDailyData", backtest44maDailyData);
router.get("/backtest44maDailyStrategy", backtest44maDailyStrategy);


router.get("/get44maDailyStocks", get44maDailyStocks);
module.exports = router;