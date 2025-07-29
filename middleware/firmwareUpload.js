const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure the upload directory exists
const uploadDir = path.join(__dirname, "../uploads/firmware");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log("Multer destination called for file:", file.originalname);
    console.log("Upload directory:", uploadDir);
    
    // Always use the main firmware upload directory
    // Don't create version-specific folders yet - we'll handle that in the controller
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    console.log("Multer filename called for file:", file.originalname);
    
    // Generate a unique filename with timestamp to avoid conflicts
    const timestamp = Date.now();
    const uniqueName = `${timestamp}-${file.originalname}`;
    
    console.log("Generated filename:", uniqueName);
    cb(null, uniqueName);
  }
});

// File filter to allow only specific types
const fileFilter = (req, file, cb) => {
  console.log("File filter called for:", file.originalname, "mimetype:", file.mimetype);
  
  // Allow common firmware and documentation file types
  const allowedMimes = [
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream', // For .bin, .hex files
    'application/pdf',
    'text/plain'
  ];
  
  const allowedExtensions = ['.zip', '.bin', '.hex', '.pdf', '.txt'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    console.log("File accepted:", file.originalname);
    cb(null, true);
  } else {
    console.log("File rejected:", file.originalname, "Extension:", fileExtension);
    cb(new Error(`File type not allowed. Allowed types: ${allowedExtensions.join(', ')}`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
    files: 10 // Maximum 10 files
  }
});

// Error handling middleware
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 100MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 10 files allowed.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field name. Use "firmware" or "documentation".'
      });
    }
  }
  
  if (error.message.includes('File type not allowed')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
};

// Export the configured upload middleware
module.exports = {
  upload,
  handleMulterError,
  // For backwards compatibility with your existing route
  uploadFields: (fields) => upload.fields(fields)
};