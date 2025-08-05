const Firmware = require("../model/file-firmware.model");
const fs = require("fs");
const path = require("path");
const { Op } = require("sequelize");
const AdmZip = require("adm-zip");

// Helper function to determine file type
const getFileType = (fileName) => {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case ".zip":
      return "zip";
    case ".bin":
      return "bin";
    case ".hex":
      return "hex";
    case ".pdf":
      return "other"; // PDFs are documentation, not firmware
    default:
      return "other";
  }
};

// Helper function to extract zip file
const extractZipFile = async (zipPath, extractToPath, version) => {
  try {
    const zip = new AdmZip(zipPath);
    const versionFolder = path.join(extractToPath, `v${version}`);

    // Create extract base path if it doesn't exist
    if (!fs.existsSync(extractToPath)) {
      fs.mkdirSync(extractToPath, { recursive: true });
    }

    // Create version folder if it doesn't exist
    if (!fs.existsSync(versionFolder)) {
      fs.mkdirSync(versionFolder, { recursive: true });
    }

    // Extract all files to version folder
    zip.extractAllTo(versionFolder, true);

    console.log(`Files extracted to: ${versionFolder}`);
    return versionFolder;
  } catch (error) {
    console.error("Error extracting zip file:", error);
    throw error;
  }
};

// Upload multiple firmware files with improved handling
const uploadFirmware = async (req, res) => {
  try {
    let allFiles = [];

    // Handle upload.any() - files will be in req.files as an array
    if (req.files && Array.isArray(req.files)) {
      allFiles = req.files;
    }
    // Handle upload.fields() - files will be in req.files as an object
    else if (req.files && typeof req.files === "object") {
      Object.keys(req.files).forEach((fieldName) => {
        if (Array.isArray(req.files[fieldName])) {
          allFiles = [...allFiles, ...req.files[fieldName]];
        } else {
          allFiles.push(req.files[fieldName]);
        }
      });
    }
    // Handle single file upload
    else if (req.file) {
      allFiles.push(req.file);
    }

    // Enhanced debugging
    console.log("Files processing result:");
    console.log("- req.files type:", typeof req.files);
    console.log("- req.files is array:", Array.isArray(req.files));
    console.log("- allFiles length:", allFiles.length);

    if (allFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "No files uploaded. Please check your form field names match the multer configuration.",
        debug: {
          hasReqFiles: !!req.files,
          hasReqFile: !!req.file,
          reqFilesType: typeof req.files,
          reqFilesIsArray: Array.isArray(req.files),
          reqFilesKeys: req.files ? Object.keys(req.files) : null,
          contentType: req.get("Content-Type"),
          bodyKeys: Object.keys(req.body),
        },
      });
    }

    console.log("Total files found:", allFiles.length);
    console.log(
      "File details:",
      allFiles.map((f) => ({
        fieldname: f.fieldname, // Add this to see which field name was used
        name: f.originalname,
        size: f.size,
        path: f.path,
        mimetype: f.mimetype,
      }))
    );

    const { version, description, deviceType, isLatest } = req.body;

    if (!version) {
      return res
        .status(400)
        .json({ success: false, message: "Version is required" });
    }

    // ... rest of your existing code remains the same

    // Create firmware entries for each file
    const firmwareEntries = [];
    const extractBasePath = path.join(__dirname, "../../firmware_extracted");

    for (const file of allFiles) {
      console.log(
        `Processing file: ${file.originalname} from field: ${file.fieldname}`
      );

      const fileType = getFileType(file.originalname);
      let extractPath = null;
      let isZipExtracted = false;
      let originalZipDeleted = false;

      const filePath = file.path;

      // Handle zip file extraction
      if (fileType === "zip") {
        try {
          extractPath = await extractZipFile(
            filePath,
            extractBasePath,
            version
          );
          isZipExtracted = true;

          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            originalZipDeleted = true;
          }
        } catch (error) {
          console.error("Error extracting zip file:", error);
        }
      }

      const firmware = await Firmware.create({
        version,
        fileName: file.originalname,
        filePath: originalZipDeleted ? null : filePath,
        extractPath,
        isLatest: isLatest === "true" || isLatest === true,
        description: description || null,
        fileSize: file.size,
        deviceType: deviceType || null,
        isZipExtracted,
        fileType,
        originalZipDeleted,
        firmwareUpdateAvailable: false,
      });

      firmwareEntries.push({
        id: firmware.id,
        version: firmware.version,
        fileName: firmware.fileName,
        fileType: firmware.fileType,
        fieldName: file.fieldname, // Include which field was used
        uploadedAt: firmware.uploadedAt,
        isZipExtracted: firmware.isZipExtracted,
        extractPath: firmware.extractPath,
        originalZipDeleted: firmware.originalZipDeleted,
      });
    }

    return res.status(201).json({
      success: true,
      message: `${firmwareEntries.length} firmware files uploaded successfully`,
      data: firmwareEntries,
    });
  } catch (error) {
    console.error("Error uploading firmware:", error);
    return res.status(500).json({
      success: false,
      message: "Error uploading firmware",
      error: error.message,
    });
  }
};

// Get all firmware with improved data
// Enhanced getAllFirmware function
const getAllFirmware = async (req, res) => {
  const baseUrl = "https://dev.roboninjaz.com/api";
  const staticBaseUrl = "https://dev.roboninjaz.com"; // For direct static file access

  try {
    const firmware = await Firmware.findAll({
      where: { deletedAt: null },
      attributes: [
        "id",
        "version",
        "fileName",
        "filePath",
        "uploadedAt",
        "isLatest",
        "description",
        "deviceType",
        "isZipExtracted",
        "extractPath",
        "fileType",
        "originalZipDeleted",
        "firmwareUpdateAvailable",
      ],
      order: [["version", "DESC"]],
    });

    // Add download URLs to each firmware
    const firmwareWithUrls = firmware.map((fw) => {
      const firmwareData = fw.toJSON();

      // Always provide API download URL
      firmwareData.downloadUrl = `${baseUrl}/firmware/download/${fw.id}`;

      // For non-extracted files, also provide direct static URL
      if (!fw.isZipExtracted && fw.filePath) {
        const fileName = path.basename(fw.filePath);
        firmwareData.directUrl = `${staticBaseUrl}/firmware/${fileName}`;
      }

      // For extracted files, provide extracted files list URL
      if (fw.isZipExtracted) {
        firmwareData.filesListUrl = `${baseUrl}/firmware/files/${fw.id}`;
        firmwareData.extractedBaseUrl = `${staticBaseUrl}/firmware-extracted/v${fw.version}/`;
      }

      return firmwareData;
    });

    return res.status(200).json({
      success: true,
      data: firmwareWithUrls,
    });
  } catch (error) {
    console.error("Error getting firmware:", error);
    return res.status(500).json({
      success: false,
      message: "Error getting firmware",
      error: error.message,
    });
  }
};

// Get latest firmware version with enhanced data
const getLatestFirmware = async (req, res) => {
  try {
    const deviceType = req.query.deviceType;
    const whereClause = { isLatest: true, deletedAt: null }; // Use correct field name

    if (deviceType) {
      whereClause.deviceType = deviceType;
    }

    const latestFirmware = await Firmware.findAll({
      where: whereClause,
      attributes: [
        "id",
        "version",
        "fileName",
        "uploadedAt",
        "description",
        "deviceType",
        "isZipExtracted",
        "extractPath",
        "fileType",
        "originalZipDeleted",
        "firmwareUpdateAvailable",
      ],
      order: [["uploadedAt", "DESC"]],
    });

    if (!latestFirmware || latestFirmware.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No firmware found" });
    }

    return res.status(200).json({
      success: true,
      data: latestFirmware,
      updateAvailable: latestFirmware.some((fw) => fw.firmwareUpdateAvailable),
    });
  } catch (error) {
    console.error("Error getting latest firmware:", error);
    return res.status(500).json({
      success: false,
      message: "Error getting latest firmware",
      error: error.message,
    });
  }
};

// Set firmware update available flag
const setFirmwareUpdateAvailable = async (req, res) => {
  try {
    const { version, deviceType } = req.body;

    if (!version) {
      return res
        .status(400)
        .json({ success: false, message: "Version is required" });
    }

    const whereClause = { version, deletedAt: null }; // Use correct field name
    if (deviceType) {
      whereClause.deviceType = deviceType;
    }

    const [updatedCount] = await Firmware.update(
      { firmwareUpdateAvailable: true },
      { where: whereClause }
    );

    if (updatedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No firmware found to update" });
    }

    return res.status(200).json({
      success: true,
      message: `Firmware update flag set for ${updatedCount} firmware(s)`,
      data: { version, deviceType, firmwareUpdateAvailable: true },
    });
  } catch (error) {
    console.error("Error setting firmware update flag:", error);
    return res.status(500).json({
      success: false,
      message: "Error setting firmware update flag",
      error: error.message,
    });
  }
};

// Clear firmware update available flag
const clearFirmwareUpdateAvailable = async (req, res) => {
  try {
    const { version, deviceType } = req.body;

    if (!version) {
      return res
        .status(400)
        .json({ success: false, message: "Version is required" });
    }

    const whereClause = { version, deletedAt: null }; // Use correct field name
    if (deviceType) {
      whereClause.deviceType = deviceType;
    }

    const [updatedCount] = await Firmware.update(
      { firmwareUpdateAvailable: false },
      { where: whereClause }
    );

    if (updatedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No firmware found to update" });
    }

    return res.status(200).json({
      success: true,
      message: `Firmware update flag cleared for ${updatedCount} firmware(s)`,
      data: { version, deviceType, firmwareUpdateAvailable: false },
    });
  } catch (error) {
    console.error("Error clearing firmware update flag:", error);
    return res.status(500).json({
      success: false,
      message: "Error clearing firmware update flag",
      error: error.message,
    });
  }
};

// Set firmware update available for all latest firmware
const setAllLatestFirmwareUpdateAvailable = async (req, res) => {
  try {
    const { deviceType } = req.body;

    const whereClause = { isLatest: true, deletedAt: null }; // Use correct field name
    if (deviceType) {
      whereClause.deviceType = deviceType;
    }

    const [updatedCount] = await Firmware.update(
      { firmwareUpdateAvailable: true },
      { where: whereClause }
    );

    return res.status(200).json({
      success: true,
      message: `Firmware update flag set for ${updatedCount} latest firmware(s)`,
      data: { deviceType, firmwareUpdateAvailable: true },
    });
  } catch (error) {
    console.error("Error setting all latest firmware update flag:", error);
    return res.status(500).json({
      success: false,
      message: "Error setting all latest firmware update flag",
      error: error.message,
    });
  }
};

const downloadFirmware = async (req, res) => {
  try {
    const { id } = req.params;
    const { file } = req.query; // Optional query parameter to download specific file from extracted ZIP

    const firmware = await Firmware.findOne({
      where: { id, deletedAt: null },
    });

    if (!firmware) {
      return res
        .status(404)
        .json({ success: false, message: "Firmware not found" });
    }

    // If it's an extracted zip file and original is deleted
    if (firmware.isZipExtracted && firmware.originalZipDeleted) {
      const extractPath = firmware.extractPath;

      if (!extractPath || !fs.existsSync(extractPath)) {
        return res
          .status(404)
          .json({ success: false, message: "Extracted files not found" });
      }

      // If specific file is requested
      if (file) {
        const requestedFilePath = path.join(extractPath, file);

        // Security check: ensure the file is within the extract path
        const normalizedExtractPath = path.resolve(extractPath);
        const normalizedFilePath = path.resolve(requestedFilePath);

        if (!normalizedFilePath.startsWith(normalizedExtractPath)) {
          return res
            .status(403)
            .json({ success: false, message: "Access denied" });
        }

        if (!fs.existsSync(requestedFilePath)) {
          return res
            .status(404)
            .json({ success: false, message: "Requested file not found" });
        }

        return res.download(requestedFilePath, file);
      }

      // If no specific file requested, create a new ZIP with all extracted files
      try {
        const zip = new AdmZip();

        // Function to recursively add files to zip
        const addDirectoryToZip = (dirPath, zipPath = "") => {
          const items = fs.readdirSync(dirPath);

          items.forEach((item) => {
            const itemPath = path.join(dirPath, item);
            const itemZipPath = zipPath ? path.join(zipPath, item) : item;

            if (fs.statSync(itemPath).isDirectory()) {
              addDirectoryToZip(itemPath, itemZipPath);
            } else {
              zip.addLocalFile(itemPath, zipPath);
            }
          });
        };

        addDirectoryToZip(extractPath);

        const zipBuffer = zip.toBuffer();
        const fileName = `${firmware.fileName.replace(".zip", "")}_v${
          firmware.version
        }.zip`;

        res.set({
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Content-Length": zipBuffer.length,
        });

        return res.send(zipBuffer);
      } catch (error) {
        console.error("Error creating ZIP from extracted files:", error);
        return res.status(500).json({
          success: false,
          message: "Error creating download package",
          error: error.message,
        });
      }
    }

    // For regular files (non-extracted), download normally
    const filePath = firmware.filePath;

    if (!filePath || !fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({ success: false, message: "File not found" });
    }

    return res.download(filePath, firmware.fileName);
  } catch (error) {
    console.error("Error downloading firmware:", error);
    return res.status(500).json({
      success: false,
      message: "Error downloading firmware",
      error: error.message,
    });
  }
};

// New endpoint to list files in extracted firmware
const listExtractedFiles = async (req, res) => {
  try {
    const { id } = req.params;

    const firmware = await Firmware.findOne({
      where: { id, deletedAt: null },
    });

    if (!firmware) {
      return res
        .status(404)
        .json({ success: false, message: "Firmware not found" });
    }

    if (!firmware.isZipExtracted || !firmware.extractPath) {
      return res
        .status(400)
        .json({ success: false, message: "Firmware is not extracted" });
    }

    const extractPath = firmware.extractPath;

    if (!fs.existsSync(extractPath)) {
      return res
        .status(404)
        .json({ success: false, message: "Extract path not found" });
    }

    // Function to recursively get all files
    const getAllFiles = (dirPath, basePath = "") => {
      const files = [];
      const items = fs.readdirSync(dirPath);

      items.forEach((item) => {
        const itemPath = path.join(dirPath, item);
        const relativePath = basePath ? path.join(basePath, item) : item;
        const stats = fs.statSync(itemPath);

        if (stats.isDirectory()) {
          files.push({
            name: item,
            path: relativePath,
            type: "directory",
            size: null,
            children: getAllFiles(itemPath, relativePath),
          });
        } else {
          files.push({
            name: item,
            path: relativePath,
            type: "file",
            size: stats.size,
            downloadUrl: `/api/firmware/download/${id}?file=${encodeURIComponent(
              relativePath
            )}`,
          });
        }
      });

      return files;
    };

    const fileList = getAllFiles(extractPath);

    return res.status(200).json({
      success: true,
      data: {
        firmwareId: firmware.id,
        version: firmware.version,
        extractPath: firmware.extractPath,
        files: fileList,
        downloadAllUrl: `/api/firmware/download/${id}`, // Download all files as ZIP
      },
    });
  } catch (error) {
    console.error("Error listing extracted files:", error);
    return res.status(500).json({
      success: false,
      message: "Error listing extracted files",
      error: error.message,
    });
  }
};

// Get firmware by version with enhanced data
const getFirmwareByVersion = async (req, res) => {
  try {
    const { version } = req.params;

    const firmware = await Firmware.findAll({
      where: { version, deletedAt: null }, // Use correct field name
      attributes: [
        "id",
        "version",
        "fileName",
        "uploadedAt",
        "description",
        "deviceType",
        "isZipExtracted",
        "extractPath",
        "fileType",
        "originalZipDeleted",
        "firmwareUpdateAvailable",
      ],
      order: [["uploadedAt", "DESC"]],
    });

    if (!firmware || firmware.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Firmware not found" });
    }

    return res.status(200).json({
      success: true,
      data: firmware,
      updateAvailable: firmware.some((fw) => fw.firmwareUpdateAvailable),
    });
  } catch (error) {
    console.error("Error getting firmware by version:", error);
    return res.status(500).json({
      success: false,
      message: "Error getting firmware by version",
      error: error.message,
    });
  }
};

// Set a firmware as latest with enhanced logic
const setLatestFirmware = async (req, res) => {
  try {
    const { id } = req.params;

    const firmware = await Firmware.findOne({
      where: { id, deletedAt: null }, // Use correct field name
    });

    if (!firmware) {
      return res
        .status(404)
        .json({ success: false, message: "Firmware not found" });
    }

    // Update all firmware to not be latest
    await Firmware.update(
      { isLatest: false },
      { where: { isLatest: true, deletedAt: null } }
    );

    // Set this firmware as latest
    firmware.isLatest = true;
    await firmware.save();

    return res.status(200).json({
      success: true,
      message: "Firmware set as latest",
      data: {
        id: firmware.id,
        version: firmware.version,
        fileName: firmware.fileName,
        uploadedAt: firmware.uploadedAt,
        fileType: firmware.fileType,
        isZipExtracted: firmware.isZipExtracted,
      },
    });
  } catch (error) {
    console.error("Error setting latest firmware:", error);
    return res.status(500).json({
      success: false,
      message: "Error setting latest firmware",
      error: error.message,
    });
  }
};

// Export all functions properly
module.exports = {
  uploadFirmware,
  getAllFirmware,
  getLatestFirmware,
  setFirmwareUpdateAvailable,
  clearFirmwareUpdateAvailable,
  setAllLatestFirmwareUpdateAvailable,
  downloadFirmware,
  listExtractedFiles,
  getFirmwareByVersion,
  setLatestFirmware,
};
