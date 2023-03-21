const express = require("express");
const router = express.Router();

const { signin, getProfile } = require("../controllers/auth");

//Validators

router.get("/signin", signin);
router.get("/getProfile", getProfile);
//router.get("/signout", signout);



module.exports = router;