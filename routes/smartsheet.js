const express = require("express");
const router = express.Router();

const { getSheet, copyWorkLoad, copyResourceLoad } = require("../controllers/smartsheet");

router.get("/smartsheet/getSheet/:id", getSheet);
router.get("/smartsheet/copyWorkLoad/:id", copyWorkLoad);
router.get("/smartsheet/copyResourceLoad/:id", copyResourceLoad)
module.exports = router;