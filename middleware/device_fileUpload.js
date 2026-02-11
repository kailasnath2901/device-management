// middleware/deviceFileUpload.js
const multer = require('multer');
const path = require('path');
const fs = require("fs");

// Configure storage - use temp directory first
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tempUploadsDir = path.join(__dirname, '../uploads/temp');
    
    if (!fs.existsSync(tempUploadsDir)) {
      fs.mkdirSync(tempUploadsDir, { recursive: true });
    }
    
    cb(null, tempUploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = `device-file-${uniqueSuffix}${extension}`;
    cb(null, filename);
  }
});

// File filter for device files
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.py', '.txt', '.json', '.xml', '.yaml', '.yml', '.conf', '.config', '.sh', '.bat'];
  const fileExt = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`
      ),
      false
    );
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for device files
  },
  fileFilter: fileFilter
});

// Error handling middleware
const handleDeviceFileUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 10MB.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field.'
      });
    }
  }

  if (error && error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next(error);
};

// Export the middleware directly
module.exports = { 
  uploadDeviceFile: upload.single('deviceFile'),
  handleDeviceFileUploadError 
};