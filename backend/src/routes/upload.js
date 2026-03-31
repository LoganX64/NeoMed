const express = require("express");
const multer = require("multer");
const router = express.Router();

const { uploadFile } = require("../controllers/uploadController");

const upload = multer(); // memory storage

router.post("/", upload.single("file"), uploadFile);

module.exports = router;
