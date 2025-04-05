const express = require("express");
const router = express.Router();
const firmwareController = require("../controllers/file-firmware.controller");
const upload = require("../middleware/firmwareUpload");
const { authenticate } = require("../middleware/auth");
const path = require("path");
const fs = require('fs');
const controllerPath = path.join(__dirname, '../controllers/file-firmware.controller.js');
// console.log('Controller exists:', fs.existsSync(controllerPath));
// // Upload firmware (restricted to admins)

// console.log("routeee",firmwareController.uploadFirmware)
router.post(
  "/upload", 
  authenticate, 
  upload.uploadFields([
    { name: "firmware", maxCount: 5 },
    { name: "documentation", maxCount: 3 }
  ]),
  firmwareController.uploadFirmware
);

// Get all firmware versions
router.get("/getFirmware", firmwareController.getAllFirmware);

// Get latest firmware version
router.get("/latest", firmwareController.getLatestFirmware);

// Get firmware by version
router.get("/version/:version", firmwareController.getFirmwareByVersion);

// Download firmware file
router.get("/download/:id", firmwareController.downloadFirmware);

// Set a firmware as latest (restricted to admins)
router.put("/set-latest/:id", authenticate, firmwareController.setLatestFirmware);

module.exports = router;