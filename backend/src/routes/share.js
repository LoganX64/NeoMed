const express = require("express");
const router = express.Router();

const shareController = require("../controllers/shareController");

router.post("/", shareController.shareDocument);
router.get("/users", shareController.getUsers);

module.exports = router;
