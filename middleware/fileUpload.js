const multer = require("multer");
const path = require("path");
const fs = require("fs");



const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../uploads/projects");
    fs.mkdirSync(uploadPath, { recursive: true });
    console.log(`Destination folder created: ${uploadPath}`);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const filename = `${Date.now()}-${file.originalname}`;
    console.log(`File uploaded: ${filename}`);
    cb(null, filename);
  },
});


const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    // ... previous allowed types
  ];

  const allowedExtensions = [
    '.py', '.txt', '.pdf', '.zip', 
    '.jpg', '.jpeg', '.png', 
    '.doc', '.docx', '.csv', 
    '.xls', '.xlsx'
  ];

  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (
    allowedTypes.includes(file.mimetype) || 
    allowedExtensions.includes(fileExtension)
  ) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type"), false);
  }
};

module.exports = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB file size limit
    files: 5, // Maximum 5 files
  },
});
