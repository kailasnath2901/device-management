const Firmware = require("../model/file-firmware.model");
const Device = require("../model/user-device.model"); // Import Device model
const fs = require("fs");
const path = require("path");
const { Op } = require("sequelize");
const sequelize = require("../config/sequelize");
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

const getDownloadBaseUrl = () => {
  // Force HTTP for download endpoints only
  const baseUrl = process.env.BASE_URL || "http://localhost:8030";
  // Remove https:// and replace with http://
  return baseUrl.replace(/^https:\/\//, "http://");
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

const getAvailableDeviceTypes = async (req, res) => {
  try {
    const deviceTypes = await Device.findAll({
      attributes: [
        "deviceType",
        [sequelize.fn("COUNT", sequelize.col("id")), "deviceCount"],
      ],
      group: ["deviceType"],
      order: [["deviceType", "ASC"]],
      raw: true,
    });

    if (!deviceTypes || deviceTypes.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "No devices found in the system. Please create devices first before uploading firmware.",
        availableDeviceTypes: [],
      });
    }

    return res.status(200).json({
      success: true,
      message: "Available device types retrieved successfully",
      availableDeviceTypes: deviceTypes.map((dt) => ({
        deviceType: dt.deviceType,
        deviceCount: parseInt(dt.deviceCount),
      })),
      totalTypes: deviceTypes.length,
    });
  } catch (error) {
    console.error("Error getting available device types:", error);
    return res.status(500).json({
      success: false,
      message: "Error getting available device types",
      error: error.message,
    });
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
        fieldname: f.fieldname,
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

    // NEW: Validate deviceType exists in Device table
    if (deviceType) {
      const deviceExists = await Device.findOne({
        where: { deviceType: deviceType },
        attributes: ["deviceType"], // Only select deviceType for efficiency
      });

      if (!deviceExists) {
        return res.status(400).json({
          success: false,
          message: `No devices found with device type '${deviceType}'. Please create devices with this type first or upload firmware without specifying device type.`,
          deviceType: deviceType,
        });
      }
    }

    // UPDATED: Handle latest firmware logic per device type
    const shouldSetAsLatest = isLatest === "true" || isLatest === true;

    if (shouldSetAsLatest && deviceType) {
      // First, set all existing firmware of this device type to not be latest
      await Firmware.update(
        { isLatest: false },
        {
          where: {
            deviceType: deviceType,
            deletedAt: null,
          },
        }
      );
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
        isLatest: shouldSetAsLatest,
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
        fieldName: file.fieldname,
        uploadedAt: firmware.uploadedAt,
        isZipExtracted: firmware.isZipExtracted,
        extractPath: firmware.extractPath,
        originalZipDeleted: firmware.originalZipDeleted,
        isLatest: firmware.isLatest,
        deviceType: firmware.deviceType,
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
      latestFirmwareInfo:
        shouldSetAsLatest && deviceType
          ? `Set as latest firmware for device type '${deviceType}'`
          : "Not set as latest firmware",
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

const getAllFirmware = async (req, res) => {
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
      order: [
        ["deviceType", "ASC"],
        ["version", "DESC"],
      ],
    });

    // Force HTTP for download URLs
    const downloadBaseUrl = getDownloadBaseUrl();

    // Add download URLs to each firmware - FORCE HTTP
    const firmwareWithUrls = firmware.map((fw) => {
      const firmwareData = fw.toJSON();

      // API download URL (requires authentication) - FORCE HTTP
      firmwareData.downloadUrl = `${downloadBaseUrl}/api/firmware/download/${fw.id}`;

      // For extracted files, provide extracted files list URL (requires authentication)
      if (fw.isZipExtracted) {
        firmwareData.filesListUrl = `${downloadBaseUrl}/api/firmware/files/${fw.id}`;
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
        "isLatest",
      ],
      order: [
        ["deviceType", "ASC"],
        ["uploadedAt", "DESC"],
      ],
    });

    if (!latestFirmware || latestFirmware.length === 0) {
      const message = deviceType
        ? `No latest firmware found for device type '${deviceType}'`
        : "No latest firmware found";

      return res.status(404).json({
        success: false,
        message: message,
        deviceType: deviceType || null,
      });
    }

    // Force HTTP for download URLs
    const downloadBaseUrl = getDownloadBaseUrl();

    // Add download URLs
    const firmwareWithUrls = latestFirmware.map((fw) => {
      const firmwareData = fw.toJSON();
      firmwareData.downloadUrl = `${downloadBaseUrl}/api/firmware/download/${fw.id}`;
      if (fw.isZipExtracted) {
        firmwareData.filesListUrl = `${downloadBaseUrl}/api/firmware/files/${fw.id}`;
      }
      return firmwareData;
    });

    // Group by device type for better organization
    const firmwareByDeviceType = {};
    firmwareWithUrls.forEach((fw) => {
      const type = fw.deviceType || "unspecified";
      if (!firmwareByDeviceType[type]) {
        firmwareByDeviceType[type] = [];
      }
      firmwareByDeviceType[type].push(fw);
    });

    return res.status(200).json({
      success: true,
      data: firmwareWithUrls,
      groupedByDeviceType: firmwareByDeviceType,
      updateAvailable: firmwareWithUrls.some((fw) => fw.firmwareUpdateAvailable),
      totalLatestFirmware: firmwareWithUrls.length,
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
        const fileName = `${firmware.fileName.replace(".zip", "")}_v${firmware.version
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

// UPDATED: Set firmware update available for all latest firmware (device-type specific)
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

    const message = deviceType
      ? `Firmware update flag set for ${updatedCount} latest firmware(s) of device type '${deviceType}'`
      : `Firmware update flag set for ${updatedCount} latest firmware(s) across all device types`;

    return res.status(200).json({
      success: true,
      message: message,
      data: {
        deviceType: deviceType || "all",
        firmwareUpdateAvailable: true,
        updatedCount,
      },
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

const getFirmwareByVersion = async (req, res) => {
  try {
    const { version } = req.params;
    const { deviceType } = req.query;

    const whereClause = { version, deletedAt: null };
    if (deviceType) {
      whereClause.deviceType = deviceType;
    }

    const firmware = await Firmware.findAll({
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
        "isLatest",
      ],
      order: [
        ["deviceType", "ASC"],
        ["uploadedAt", "DESC"],
      ],
    });

    if (!firmware || firmware.length === 0) {
      const message = deviceType
        ? `No firmware found for version '${version}' and device type '${deviceType}'`
        : `No firmware found for version '${version}'`;

      return res.status(404).json({
        success: false,
        message: message,
        version: version,
        deviceType: deviceType || null,
      });
    }

    // Force HTTP for download URLs
    const downloadBaseUrl = getDownloadBaseUrl();

    // Add download URLs
    const firmwareWithUrls = firmware.map((fw) => {
      const firmwareData = fw.toJSON();
      firmwareData.downloadUrl = `${downloadBaseUrl}/api/firmware/download/${fw.id}`;
      if (fw.isZipExtracted) {
        firmwareData.filesListUrl = `${downloadBaseUrl}/api/firmware/files/${fw.id}`;
      }
      return firmwareData;
    });

    return res.status(200).json({
      success: true,
      data: firmwareWithUrls,
      updateAvailable: firmwareWithUrls.some((fw) => fw.firmwareUpdateAvailable),
      version: version,
      deviceType: deviceType || null,
      totalFound: firmwareWithUrls.length,
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


// UPDATED: Set a firmware as latest with device-type specific logic
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

    // Use transaction to ensure data consistency
    const result = await sequelize.transaction(async (t) => {
      const deviceType = firmware.deviceType;

      if (deviceType) {
        // Update all firmware of the same device type to not be latest
        await Firmware.update(
          { isLatest: false },
          {
            where: {
              deviceType: deviceType,
              deletedAt: null,
            },
            transaction: t,
          }
        );

        console.log(
          `Cleared latest flag for all firmware of device type '${deviceType}'`
        );
      } else {
        // If no device type, update all firmware with no device type to not be latest
        await Firmware.update(
          { isLatest: false },
          {
            where: {
              deviceType: null,
              deletedAt: null,
            },
            transaction: t,
          }
        );

        console.log("Cleared latest flag for all firmware with no device type");
      }

      // Set this firmware as latest
      await firmware.update({ isLatest: true }, { transaction: t });

      console.log(
        `Set firmware ID ${firmware.id} (version ${firmware.version
        }) as latest for device type '${deviceType || "unspecified"}'`
      );

      return {
        firmware,
        deviceType,
        clearedOthers: true,
      };
    });

    return res.status(200).json({
      success: true,
      message: `Firmware set as latest for device type '${result.deviceType || "unspecified"
        }'`,
      data: {
        id: result.firmware.id,
        version: result.firmware.version,
        fileName: result.firmware.fileName,
        uploadedAt: result.firmware.uploadedAt,
        fileType: result.firmware.fileType,
        isZipExtracted: result.firmware.isZipExtracted,
        deviceType: result.firmware.deviceType,
        isLatest: true,
      },
      deviceType: result.deviceType || null,
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

// UPDATED: Delete firmware with device-type aware latest firmware handling
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
      `Starting deletion process for firmware ID: ${id}, Version: ${firmware.version
      }, Device Type: ${firmware.deviceType || "unspecified"}`
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

    // UPDATED: If this firmware was marked as latest, set another version as latest for the same device type
    let newLatestSet = false;
    if (firmware.isLatest) {
      try {
        const deviceType = firmware.deviceType;

        // Find the next most recent firmware of the same device type to set as latest
        const whereClause = {
          id: { [Op.ne]: firmware.id }, // Exclude current firmware
          deletedAt: null,
        };

        // Only filter by device type if the deleted firmware had a device type
        if (deviceType) {
          whereClause.deviceType = deviceType;
        } else {
          whereClause.deviceType = null; // Look for firmware with no device type
        }

        const nextLatest = await Firmware.findOne({
          where: whereClause,
          order: [["uploadedAt", "DESC"]],
          paranoid: true, // Only non-deleted records
        });

        if (nextLatest) {
          await nextLatest.update({ isLatest: true });
          newLatestSet = {
            id: nextLatest.id,
            version: nextLatest.version,
            fileName: nextLatest.fileName,
            deviceType: nextLatest.deviceType,
          };
          console.log(
            `Set new latest firmware for device type '${deviceType || "unspecified"
            }': ${nextLatest.version}`
          );
        } else {
          console.log(
            `No other firmware found for device type '${deviceType || "unspecified"
            }' to set as latest`
          );
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
          deviceTypeAffected: firmware.deviceType || "unspecified",
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

const getFirmwareByDeviceType = async (req, res) => {
  try {
    const { deviceType } = req.params;

    if (!deviceType) {
      return res.status(400).json({
        success: false,
        message: "Device type is required",
      });
    }

    const firmware = await Firmware.findAll({
      where: {
        deviceType: deviceType,
        deletedAt: null,
      },
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
        "isLatest",
      ],
      order: [["uploadedAt", "DESC"]],
    });

    if (!firmware || firmware.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No firmware found for device type '${deviceType}'`,
        deviceType: deviceType,
      });
    }

    // Force HTTP for download URLs
    const downloadBaseUrl = getDownloadBaseUrl();

    // Add download URLs
    const firmwareWithUrls = firmware.map((fw) => {
      const firmwareData = fw.toJSON();
      firmwareData.downloadUrl = `${downloadBaseUrl}/api/firmware/download/${fw.id}`;
      if (fw.isZipExtracted) {
        firmwareData.filesListUrl = `${downloadBaseUrl}/api/firmware/files/${fw.id}`;
      }
      return firmwareData;
    });

    const latestFirmware = firmwareWithUrls.find((fw) => fw.isLatest);

    return res.status(200).json({
      success: true,
      data: firmwareWithUrls,
      deviceType: deviceType,
      totalFirmware: firmwareWithUrls.length,
      latestFirmware: latestFirmware || null,
      hasUpdateAvailable: firmwareWithUrls.some((fw) => fw.firmwareUpdateAvailable),
    });
  } catch (error) {
    console.error("Error getting firmware by device type:", error);
    return res.status(500).json({
      success: false,
      message: "Error getting firmware by device type",
      error: error.message,
    });
  }
};


const getLatestFirmwareByDeviceType = async (req, res) => {
  try {
    const { deviceType } = req.params;

    if (!deviceType) {
      return res.status(400).json({
        success: false,
        message: "Device type is required",
      });
    }

    const latestFirmware = await Firmware.findOne({
      where: {
        deviceType: deviceType,
        isLatest: true,
        deletedAt: null,
      },
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
        "isLatest",
      ],
      order: [["uploadedAt", "DESC"]],
    });

    if (!latestFirmware) {
      return res.status(404).json({
        success: false,
        message: `No latest firmware found for device type '${deviceType}'`,
        deviceType: deviceType,
      });
    }

    // Force HTTP for download URLs
    const downloadBaseUrl = getDownloadBaseUrl();
    const firmwareData = latestFirmware.toJSON();
    firmwareData.downloadUrl = `${downloadBaseUrl}/api/firmware/download/${latestFirmware.id}`;
    if (latestFirmware.isZipExtracted) {
      firmwareData.filesListUrl = `${downloadBaseUrl}/api/firmware/files/${latestFirmware.id}`;
    }

    return res.status(200).json({
      success: true,
      data: firmwareData,
      deviceType: deviceType,
      updateAvailable: firmwareData.firmwareUpdateAvailable,
    });
  } catch (error) {
    console.error("Error getting latest firmware by device type:", error);
    return res.status(500).json({
      success: false,
      message: "Error getting latest firmware by device type",
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
  getAvailableDeviceTypes,
  getLatestFirmwareByDeviceType,
  getFirmwareByDeviceType,
};
