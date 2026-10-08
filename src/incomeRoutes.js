const express = require("express");
const { getIncome } = require("../Controllers/incomeController");

const router = express.Router();

router.get("/income", getIncome);

module.exports = router;