// middleware/uploadDeviceAvatar.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const createDeviceAvatarUpload = (req, res, next) => {
  // Create uploads directory for devices if it doesn't exist
  const uploadsDir = path.join(__dirname, '../uploads/devices');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Configure storage
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      // Create device-specific folder
      const deviceId = req.params.deviceId;
      const deviceDir = path.join(uploadsDir, deviceId.toString());
      if (!fs.existsSync(deviceDir)) {
        fs.mkdirSync(deviceDir, { recursive: true });
      }
      cb(null, deviceDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname);
      const filename = `avatar-${uniqueSuffix}${extension}`;
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

  // Configure multer
  const upload = multer({
    storage: storage,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit for avatar
    },
    fileFilter: fileFilter
  });

  return upload.single('avatar');
};

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

module.exports = { createDeviceAvatarUpload, handleDeviceAvatarUploadError };