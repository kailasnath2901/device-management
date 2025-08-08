const Firmware = require("../model/file-firmware.model");
const Device = require("../model/user-device.model"); // Import Device model
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

// Helper function to update devices when firmware is uploaded
const updateDevicesForNewFirmware = async (deviceType, version) => {
  try {
    if (!deviceType) {
      console.log("No deviceType specified, skipping device updates");
      return { updatedCount: 0 };
    }

    // Update all devices of this deviceType to have updateAvailable = true
    const [updatedCount] = await Device.update(
      { updateAvailable: true },
      {
        where: {
          deviceType: deviceType,
        },
      }
    );

    console.log(
      `Updated ${updatedCount} devices of type '${deviceType}' to have update available`
    );

    return { updatedCount, deviceType, version };
  } catch (error) {
    console.error("Error updating devices for new firmware:", error);
    throw error;
  }
};

// Upload multiple firmware files with improved handling and device update logic
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

    // Update all devices of the specified deviceType to have updateAvailable = true
    let deviceUpdateResult = { updatedCount: 0 };
    if (deviceType) {
      try {
        deviceUpdateResult = await updateDevicesForNewFirmware(
          deviceType,
          version
        );
      } catch (error) {
        console.error("Failed to update devices:", error);
        // Don't fail the entire operation if device update fails
      }
    }

    return res.status(201).json({
      success: true,
      message: `${firmwareEntries.length} firmware files uploaded successfully`,
      data: firmwareEntries,
      deviceUpdates: {
        devicesUpdated: deviceUpdateResult.updatedCount,
        deviceType: deviceType,
        message: deviceType
          ? `${deviceUpdateResult.updatedCount} devices of type '${deviceType}' marked as having updates available`
          : "No deviceType specified, no devices updated",
      },
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

// New API: Mark devices as having update available by deviceType
const markDevicesUpdateAvailable = async (req, res) => {
  try {
    const { deviceType, serialNumbers } = req.body;

    if (!deviceType && (!serialNumbers || serialNumbers.length === 0)) {
      return res.status(400).json({
        success: false,
        message: "Either deviceType or serialNumbers array is required",
      });
    }

    let whereClause = {};

    if (serialNumbers && serialNumbers.length > 0) {
      // Update specific devices by serial numbers
      whereClause.serialNumber = { [Op.in]: serialNumbers };
      if (deviceType) {
        whereClause.deviceType = deviceType;
      }
    } else {
      // Update all devices of a specific type
      whereClause.deviceType = deviceType;
    }

    const [updatedCount] = await Device.update(
      { updateAvailable: true },
      { where: whereClause }
    );

    const updatedDevices = await Device.findAll({
      where: whereClause,
      attributes: [
        "id",
        "serialNumber",
        "deviceType",
        "deviceName",
        "updateAvailable",
      ],
    });

    return res.status(200).json({
      success: true,
      message: `${updatedCount} devices marked as having updates available`,
      data: {
        updatedCount,
        deviceType,
        serialNumbers,
        updatedDevices,
      },
    });
  } catch (error) {
    console.error("Error marking devices as having updates:", error);
    return res.status(500).json({
      success: false,
      message: "Error marking devices as having updates",
      error: error.message,
    });
  }
};

// New API: Clear update available flag for devices
const clearDevicesUpdateAvailable = async (req, res) => {
  try {
    const { deviceType, serialNumbers } = req.body;

    if (!deviceType && (!serialNumbers || serialNumbers.length === 0)) {
      return res.status(400).json({
        success: false,
        message: "Either deviceType or serialNumbers array is required",
      });
    }

    let whereClause = {};

    if (serialNumbers && serialNumbers.length > 0) {
      // Clear specific devices by serial numbers
      whereClause.serialNumber = { [Op.in]: serialNumbers };
      if (deviceType) {
        whereClause.deviceType = deviceType;
      }
    } else {
      // Clear all devices of a specific type
      whereClause.deviceType = deviceType;
    }

    const [updatedCount] = await Device.update(
      { updateAvailable: false },
      { where: whereClause }
    );

    const updatedDevices = await Device.findAll({
      where: whereClause,
      attributes: [
        "id",
        "serialNumber",
        "deviceType",
        "deviceName",
        "updateAvailable",
      ],
    });

    return res.status(200).json({
      success: true,
      message: `${updatedCount} devices cleared of update available flag`,
      data: {
        updatedCount,
        deviceType,
        serialNumbers,
        updatedDevices,
      },
    });
  } catch (error) {
    console.error("Error clearing device update flags:", error);
    return res.status(500).json({
      success: false,
      message: "Error clearing device update flags",
      error: error.message,
    });
  }
};

// New API: Get devices with update available
const getDevicesWithUpdateAvailable = async (req, res) => {
  try {
    const { deviceType, userId } = req.query;

    let whereClause = { updateAvailable: true };

    if (deviceType) {
      whereClause.deviceType = deviceType;
    }

    if (userId) {
      whereClause.userId = userId;
    }

    const devices = await Device.findAll({
      where: whereClause,
      attributes: [
        "id",
        "serialNumber",
        "deviceType",
        "deviceName",
        "nickName",
        "firmwareVersion",
        "updateAvailable",
        "userId",
      ],
      order: [
        ["deviceType", "ASC"],
        ["deviceName", "ASC"],
      ],
    });

    const devicesByType = devices.reduce((acc, device) => {
      const type = device.deviceType;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(device);
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      data: {
        devices,
        devicesByType,
        totalCount: devices.length,
        summary: Object.keys(devicesByType).map((type) => ({
          deviceType: type,
          count: devicesByType[type].length,
        })),
      },
    });
  } catch (error) {
    console.error("Error getting devices with updates available:", error);
    return res.status(500).json({
      success: false,
      message: "Error getting devices with updates available",
      error: error.message,
    });
  }
};

// Enhanced getAllFirmware function - Updated for secure access
const getAllFirmware = async (req, res) => {
  const baseUrl = "https://dev.roboninjaz.com/api";
  // REMOVED: staticBaseUrl since direct access is no longer available

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

    // Add download URLs to each firmware - ONLY API URLs with auth required
    const firmwareWithUrls = firmware.map((fw) => {
      const firmwareData = fw.toJSON();

      // API download URL (requires authentication)
      firmwareData.downloadUrl = `${baseUrl}/firmware/download/${fw.id}`;

      // REMOVED: Direct static URL access
      // For extracted files, provide extracted files list URL (requires authentication)
      if (fw.isZipExtracted) {
        firmwareData.filesListUrl = `${baseUrl}/firmware/files/${fw.id}`;
        // REMOVED: extractedBaseUrl since direct access is secured
      }

      return firmwareData;
    });

    return res.status(200).json({
      success: true,
      data: firmwareWithUrls,
      message: "Note: All downloads require authentication",
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

// Updated listExtractedFiles function
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

    // Function to recursively get all file paths as strings
    const getAllFilePaths = (dirPath, basePath = "") => {
      const filePaths = [];
      const items = fs.readdirSync(dirPath);

      items.forEach((item) => {
        const itemPath = path.join(dirPath, item);
        const relativePath = basePath ? path.join(basePath, item) : item;
        const stats = fs.statSync(itemPath);

        if (stats.isDirectory()) {
          // Recursively get files from subdirectories
          const subFiles = getAllFilePaths(itemPath, relativePath);
          filePaths.push(...subFiles);
        } else {
          // Add file path to the list
          filePaths.push(relativePath);
        }
      });

      return filePaths;
    };

    const fileList = getAllFilePaths(extractPath);

    return res.status(200).json({
      success: true,
      data: {
        firmwareId: firmware.id,
        version: firmware.version,
        files: fileList,
        downloadAllUrl: `/api/firmware/download/${id}`,
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

// Get latest firmware version with enhanced data
const getLatestFirmware = async (req, res) => {
  try {
    const deviceType = req.query.deviceType;
    const whereClause = { isLatest: true, deletedAt: null };

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

// Protected firmware download with authorization
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

// Protected file preview endpoint (for viewing file contents without downloading)
const previewFirmware = async (req, res) => {
  try {
    const { id } = req.params;
    const { file } = req.query;

    const firmware = await Firmware.findOne({
      where: { id, deletedAt: null },
    });

    if (!firmware) {
      return res
        .status(404)
        .json({ success: false, message: "Firmware not found" });
    }

    let filePath;
    let fileName;

    // Handle extracted files
    if (firmware.isZipExtracted && firmware.extractPath) {
      if (!file) {
        return res.status(400).json({
          success: false,
          message: "File parameter required for extracted firmware",
        });
      }

      filePath = path.join(firmware.extractPath, file);
      fileName = file;

      // Security check
      const normalizedExtractPath = path.resolve(firmware.extractPath);
      const normalizedFilePath = path.resolve(filePath);

      if (!normalizedFilePath.startsWith(normalizedExtractPath)) {
        return res
          .status(403)
          .json({ success: false, message: "Access denied" });
      }
    } else {
      // Handle regular files
      filePath = firmware.filePath;
      fileName = firmware.fileName;
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({ success: false, message: "File not found" });
    }

    // Set appropriate content type based on file extension
    const ext = path.extname(fileName).toLowerCase();
    let contentType = "application/octet-stream";

    switch (ext) {
      case ".txt":
      case ".log":
        contentType = "text/plain";
        break;
      case ".json":
        contentType = "application/json";
        break;
      case ".xml":
        contentType = "application/xml";
        break;
      case ".pdf":
        contentType = "application/pdf";
        break;
      case ".bin":
      case ".hex":
        contentType = "application/octet-stream";
        break;
    }

    res.set({
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${fileName}"`,
    });

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error("Error previewing firmware:", error);
    return res.status(500).json({
      success: false,
      message: "Error previewing firmware",
      error: error.message,
    });
  }
};

const setFirmwareUpdateAvailable = async (req, res) => {
  try {
    const { version, deviceType, id } = req.body;

    // Validate input - either id or version should be provided
    if (!version && !id) {
      return res.status(400).json({
        success: false,
        message: "Either version or id is required",
      });
    }

    let whereClause = { deletedAt: null };

    // If ID is provided, use it (more specific)
    if (id) {
      whereClause.id = id;
    } else {
      // If only version is provided, use version and optionally deviceType
      whereClause.version = version;
      if (deviceType) {
        whereClause.deviceType = deviceType;
      }
    }

    console.log("Updating firmware with whereClause:", whereClause);

    // Use a transaction to ensure data consistency
    const result = await Firmware.sequelize.transaction(async (t) => {
      const [updatedCount] = await Firmware.update(
        { firmwareUpdateAvailable: true },
        {
          where: whereClause,
          transaction: t,
        }
      );

      if (updatedCount === 0) {
        throw new Error("No firmware found to update");
      }

      // Get the updated firmware records to return
      const updatedFirmware = await Firmware.findAll({
        where: whereClause,
        attributes: ["id", "version", "deviceType", "firmwareUpdateAvailable"],
        transaction: t,
      });

      return { updatedCount, updatedFirmware };
    });

    console.log(`Successfully updated ${result.updatedCount} firmware(s)`);

    return res.status(200).json({
      success: true,
      message: `Firmware update flag set for ${result.updatedCount} firmware(s)`,
      data: result.updatedFirmware,
    });
  } catch (error) {
    console.error("Error setting firmware update flag:", error);

    if (error.message === "No firmware found to update") {
      return res.status(404).json({
        success: false,
        message: "No firmware found to update",
      });
    }

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

    const whereClause = { version, deletedAt: null };
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

    const whereClause = { isLatest: true, deletedAt: null };
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

// Get firmware by version with enhanced data
const getFirmwareByVersion = async (req, res) => {
  try {
    const { version } = req.params;

    const firmware = await Firmware.findAll({
      where: { version, deletedAt: null },
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
      where: { id, deletedAt: null },
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

const deleteFirmware = async (req, res) => {
  try {
    const { id } = req.params;

    const firmware = await Firmware.findOne({
      where: { id },
      paranoid: false, // This includes soft-deleted records
    });

    if (!firmware) {
      return res.status(404).json({
        success: false,
        message: "Firmware not found",
      });
    }

    console.log(
      `Starting deletion process for firmware ID: ${id}, Version: ${firmware.version}`
    );

    let filesDeleted = [];
    let deletionErrors = [];

    // Delete original file if it exists
    if (firmware.filePath && fs.existsSync(firmware.filePath)) {
      try {
        fs.unlinkSync(firmware.filePath);
        filesDeleted.push(firmware.filePath);
        console.log(`Deleted original file: ${firmware.filePath}`);
      } catch (error) {
        console.error(
          `Error deleting original file ${firmware.filePath}:`,
          error
        );
        deletionErrors.push({
          file: firmware.filePath,
          error: error.message,
        });
      }
    }

    // Delete extracted folder and all its contents if it exists
    if (firmware.extractPath && fs.existsSync(firmware.extractPath)) {
      try {
        // Recursively delete the entire extracted directory
        const deleteDirectory = (dirPath) => {
          const items = fs.readdirSync(dirPath);

          items.forEach((item) => {
            const itemPath = path.join(dirPath, item);
            const stats = fs.statSync(itemPath);

            if (stats.isDirectory()) {
              deleteDirectory(itemPath); // Recursive call for subdirectories
            } else {
              fs.unlinkSync(itemPath); // Delete file
              filesDeleted.push(itemPath);
            }
          });

          fs.rmdirSync(dirPath); // Delete the empty directory
        };

        deleteDirectory(firmware.extractPath);
        filesDeleted.push(firmware.extractPath + " (directory)");
        console.log(`Deleted extracted directory: ${firmware.extractPath}`);
      } catch (error) {
        console.error(
          `Error deleting extracted directory ${firmware.extractPath}:`,
          error
        );
        deletionErrors.push({
          file: firmware.extractPath,
          error: error.message,
        });
      }
    }

    // If this firmware was marked as latest, we might want to set another version as latest
    let newLatestSet = false;
    if (firmware.isLatest) {
      try {
        // Find the next most recent firmware of the same device type to set as latest
        const nextLatest = await Firmware.findOne({
          where: {
            id: { [Op.ne]: firmware.id }, // Exclude current firmware
            deletedAt: null,
            ...(firmware.deviceType && { deviceType: firmware.deviceType }),
          },
          order: [["uploadedAt", "DESC"]],
          paranoid: true, // Only non-deleted records
        });

        if (nextLatest) {
          await nextLatest.update({ isLatest: true });
          newLatestSet = {
            id: nextLatest.id,
            version: nextLatest.version,
            fileName: nextLatest.fileName,
          };
          console.log(`Set new latest firmware: ${nextLatest.version}`);
        }
      } catch (error) {
        console.error("Error setting new latest firmware:", error);
        deletionErrors.push({
          operation: "setting new latest firmware",
          error: error.message,
        });
      }
    }

    // Permanently delete the firmware record from database (hard delete)
    await firmware.destroy({ force: true }); // force: true ensures hard delete even with paranoid mode

    console.log(
      `Successfully deleted firmware record from database: ${firmware.version}`
    );

    return res.status(200).json({
      success: true,
      message: "Firmware deleted successfully",
      data: {
        deletedFirmware: {
          id: firmware.id,
          version: firmware.version,
          fileName: firmware.fileName,
          deviceType: firmware.deviceType,
        },
        filesDeleted: filesDeleted,
        deletionErrors: deletionErrors.length > 0 ? deletionErrors : null,
        newLatestFirmware: newLatestSet || null,
        summary: {
          totalFilesDeleted: filesDeleted.length,
          hasErrors: deletionErrors.length > 0,
          wasLatest: firmware.isLatest,
          newLatestSet: !!newLatestSet,
        },
      },
    });
  } catch (error) {
    console.error("Error deleting firmware:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting firmware",
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
  previewFirmware,
  listExtractedFiles,
  getFirmwareByVersion,
  setLatestFirmware,
  deleteFirmware,
};
