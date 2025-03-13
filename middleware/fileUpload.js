// middleware/fileUpload.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

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
    '.xls', '.xlsx'
  ];

  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type"), false);
  }
};
const upload = multer({
  storage: projectFileStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB file size limit
    files: 5, // Maximum 5 files
  },
});

// middleware/fileUpload.js
// Replace the export section with:
module.exports = multer({
  storage: projectFileStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB file size limit
    files: 5, // Maximum 5 files
  },
});