// middleware/firmwareUpload.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const firmwareStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const version = req.body.version || "unknown";
    // Create a folder for each version
    const uploadPath = path.join(__dirname, `../uploads/firmware/${version}`); // Fixed template string
    fs.mkdirSync(uploadPath, { recursive: true });
    console.log(`Firmware folder created: ${uploadPath}`); // Fixed template string
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Keep original filename for firmware files
    console.log(`Firmware uploaded with name: ${file.originalname}`); // Fixed template string
    cb(null, file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  // Allow all file types for firmware
  cb(null, true);
};

module.exports = multer({
  storage: firmwareStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB file size limit
  },
});