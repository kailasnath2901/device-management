// middleware/fileUpload.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const AdmZip = require("adm-zip"); // Make sure to install this package first with npm install adm-zip

// Create separate storage for project images (public) and project files (private)
const projectFileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      const uploadPath = path.join(__dirname, "../public/images/projects");
      fs.mkdirSync(uploadPath, { recursive: true });
      console.log(`Public image folder created: ${uploadPath}`);
      cb(null, uploadPath);
    } else {
      // Regular project files
      const uploadPath = path.join(__dirname, "../uploads/projects");
      fs.mkdirSync(uploadPath, { recursive: true });
      console.log(`Project files folder created: ${uploadPath}`);
      cb(null, uploadPath);
    }
  },
  filename: (req, file, cb) => {
    // As per requirement: do not edit the image name
    // For images, keep original filename
    if (file.mimetype.startsWith('image/')) {
      console.log(`Image uploaded with original name: ${file.originalname}`);
      cb(null, file.originalname);
    } else {
      // For other files, prefix with timestamp to avoid conflicts
      const filename = `${Date.now()}-${file.originalname}`;
      console.log(`File uploaded: ${filename}`);
      cb(null, filename);
    }
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = [
    '.py', '.txt', '.pdf', '.zip', 
    '.jpg', '.jpeg', '.png', '.gif', // Make sure to include all image types
    '.doc', '.docx', '.csv', 
    '.xls', '.xlsx' ,'.html'
  ];

  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type"), false);
  }
};

// ZIP file processing middleware
const processZipFiles = (req, res, next) => {
  // Skip if no files uploaded
  if (!req.files || !req.files.files) {
    return next();
  }
  
  const zipProcessingPromises = req.files.files.map(async (file) => {
    // Check if the file is a ZIP file
    if (path.extname(file.originalname).toLowerCase() === '.zip') {
      try {
        console.log(`Processing ZIP file: ${file.originalname}`);
        
        // Create folder with zip name (without extension)
        const zipNameWithoutExt = path.basename(file.originalname, '.zip');
        const extractPath = path.join(path.dirname(file.path), zipNameWithoutExt);
        
        // Create extraction directory
        fs.mkdirSync(extractPath, { recursive: true });
        
        // Extract the zip file
        const zip = new AdmZip(file.path);
        zip.extractAllTo(extractPath, true);
        
        console.log(`ZIP extracted to: ${extractPath}`);
        
        // Update file path in the request to point to the folder
        file.extractPath = extractPath;
        file.isExtracted = true;
        
        // Optional: Delete the original zip file after extraction
        // fs.unlinkSync(file.path);
      } catch (error) {
        console.error(`Error extracting ZIP file ${file.originalname}:`, error);
      }
    }
  });
  
  // Wait for all zip files to be processed
  Promise.all(zipProcessingPromises)
    .then(() => next())
    .catch(error => {
      console.error("Error processing ZIP files:", error);
      next();
    });
};

// Create the multer middleware
const upload = multer({
  storage: projectFileStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB file size limit
    files: 5, // Maximum 5 files
  },
});

// Export a combined middleware that handles multer upload and then processes any zip files
module.exports = {
  uploadFields: (fields) => {
    return [
      upload.fields(fields),
      processZipFiles
    ];
  },
  upload: upload
};