const express = require("express");
const router = express.Router();
const firmwareController = require("../controllers/file-firmware.controller");
const { upload, handleMulterError } = require("../middleware/firmwareUpload");
const { authenticate, authorizeRoles } = require("../middleware/auth");

// Upload firmware (restricted to admins)
router.post(
  "/upload",
  authenticate,
  authorizeRoles("admin", "super_admin"),
  upload.fields([
    { name: "firmware", maxCount: 5 },
    { name: "documentation", maxCount: 3 },
  ]),
  handleMulterError, // Add error handling middleware
  firmwareController.uploadFirmware
);

// Get all firmware versions
router.get("/getFirmware", authenticate, firmwareController.getAllFirmware);

// Get latest firmware version
router.get("/latest", authenticate, firmwareController.getLatestFirmware);

// Get firmware by version
router.get("/version/:version",authenticate, firmwareController.getFirmwareByVersion);

router.get("/files/:id", authenticate, firmwareController.listExtractedFiles);

// Download firmware file - REQUIRES AUTH for actual file access
router.get("/download/:id", authenticate, firmwareController.downloadFirmware);

// Set a firmware as latest (restricted to admins)
router.put(
  "/set-latest/:id",
  authenticate,
  firmwareController.setLatestFirmware
);

// Firmware update flag endpoints
router.put(
  "/update-flag/set",
  authenticate,
  firmwareController.setFirmwareUpdateAvailable
);
router.put(
  "/update-flag/clear",
  authenticate,
  firmwareController.clearFirmwareUpdateAvailable
);
router.put(
  "/update-flag/set-all-latest",
  authenticate,
  firmwareController.setAllLatestFirmwareUpdateAvailable
);

router.get(
  "/admin/available-device-types",
  authenticate,
  authorizeRoles("admin", "super_admin"),
  firmwareController.getAvailableDeviceTypes
);

router.delete(
  "/delete/:id",
  authenticate,
  authorizeRoles("admin", "super_admin"),
  firmwareController.deleteFirmware
);

module.exports = router;
