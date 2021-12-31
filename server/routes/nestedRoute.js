const express = require("express");
const router = express.Router();
const { HOST } = require("../utils/secrets.json");

router.get("/contact-us", async (req, res) => {
    res.redirect(HOST + 'contact-us');
});
router.get("/about", async (req, res) => {
    res.redirect(HOST + 'about');
});


module.exports = router;
