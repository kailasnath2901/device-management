// middleware/firmwareUpload.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const AdmZip = require("adm-zip"); // Make sure to install this package

const firmwareStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const version = req.body.version || "unknown";
    // Create a folder for each version
    const uploadPath = path.join(__dirname, `../uploads/firmware/${version}`);
    fs.mkdirSync(uploadPath, { recursive: true });
    console.log(`Firmware folder created: ${uploadPath}`);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Keep original filename for firmware files
    console.log(`Firmware uploaded with name: ${file.originalname}`);
    cb(null, file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  // Allow firmware related file types
  const allowedExtensions = [
    '.bin', '.hex', '.fw', '.zip', '.img',
    '.txt', '.pdf', '.md', '.json', '.cfg'
  ];

  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid firmware file type"), false);
  }
};

// ZIP file processing middleware for firmware
const processFirmwareZip = (req, res, next) => {
  // Skip if no files uploaded
  if (!req.files) {
    return next();
  }
  
  // Get all files from all fields
  let allFiles = [];
  Object.keys(req.files).forEach(field => {
    allFiles = [...allFiles, ...req.files[field]];
  });
  
  // Process any zip files
  const zipProcessingPromises = allFiles
    .filter(file => path.extname(file.originalname).toLowerCase() === '.zip')
    .map(async (file) => {
      try {
        console.log(`Processing firmware ZIP file: ${file.originalname}`);
        
        // Create folder with zip name (without extension)
        const zipNameWithoutExt = path.basename(file.originalname, '.zip');
        const extractPath = path.join(path.dirname(file.path), zipNameWithoutExt);
        
        // Create extraction directory
        fs.mkdirSync(extractPath, { recursive: true });
        
        // Extract the zip file
        const zip = new AdmZip(file.path);
        zip.extractAllTo(extractPath, true);
        
        console.log(`Firmware ZIP extracted to: ${extractPath}`);
        
        // Add extracted info to the file object
        file.extractPath = extractPath;
        file.isExtracted = true;
      } catch (error) {
        console.error(`Error extracting firmware ZIP file ${file.originalname}:`, error);
      }
    });
  
  // Wait for all zip processing to complete
  Promise.all(zipProcessingPromises)
    .then(() => next())
    .catch(error => {
      console.error("Error processing firmware ZIP files:", error);
      next();
    });
};

// Create the multer middleware
const upload = multer({
  storage: firmwareStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB file size limit
    files: 10, // Maximum 10 firmware files
  },
});

// Export middleware that handles multer upload and processes any zip files
module.exports = {
  uploadFields: (fields) => {
    return [
      upload.fields(fields),
      processFirmwareZip
    ];
  },
  uploadMany: upload.array.bind(upload),
  uploadSingle: upload.single.bind(upload),
  upload: upload
};