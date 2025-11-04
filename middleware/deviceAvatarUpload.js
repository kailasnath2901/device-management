// middleware/uploadDeviceAvatar.js - PROPERLY FIXED
const multer = require('multer');
const path = require('path');
const fs = require("fs");

// Configure storage - use temp directory first (same as user avatar)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Use a temporary uploads directory (not device-specific yet)
    const tempUploadsDir = path.join(__dirname, '../uploads/temp');
    
    if (!fs.existsSync(tempUploadsDir)) {
      fs.mkdirSync(tempUploadsDir, { recursive: true });
    }
    
    cb(null, tempUploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = `device-avatar-${uniqueSuffix}${extension}`;
    cb(null, filename);
  }
});

// File filter for avatar images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/svg+xml',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only image files are allowed.'), false);
  }
};

// Configure multer ONCE (not inside a function)
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for avatar
  },
  fileFilter: fileFilter
});

// Error handling middleware for multer
const handleDeviceAvatarUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field.'
      });
    }
  }

  if (error.message === 'Invalid file type. Only image files are allowed.') {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next(error);
};

// Export the middleware directly (not as a function)
module.exports = { 
  uploadDeviceAvatar: upload.single('avatar'),
  handleDeviceAvatarUploadError 
};