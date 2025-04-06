const Firmware = require("../model/file-firmware.model");
const fs = require("fs");
const path = require("path");
const { Op } = require("sequelize");

// Upload multiple firmware files
exports.uploadFirmware = async (req, res) => {
  try {
    // Check if we have files
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ success: false, message: "No files uploaded" });
    }

    const { version, description, deviceType } = req.body;
    
    if (!version) {
      return res.status(400).json({ success: false, message: "Version is required" });
    }

    // Check if this version already exists
    const existingFirmware = await Firmware.findOne({
      where: { version }
    });

    if (existingFirmware) {
      // Don't overwrite - we'll create new entries
      console.log(`Firmware version ${version} already exists, creating new entries`);
    }

    // If this is the first firmware or marked as latest, update all others to not be latest
    if (req.body.isLatest === 'true' || !(await Firmware.findOne({ where: { isLatest: true } }))) {
      await Firmware.update({ isLatest: false }, { where: { isLatest: true } });
    }

    // Get all uploaded files (from all fields)
    let allFiles = [];
    Object.keys(req.files).forEach(fieldName => {
      allFiles = [...allFiles, ...req.files[fieldName]];
    });

    // Create firmware entries for each file
    const firmwareEntries = [];
    for (const file of allFiles) {
      // Create new firmware entry
      const firmware = await Firmware.create({
        version,
        fileName: file.originalname,
        filePath: file.path,
        extractPath: file.isExtracted ? file.extractPath : null,
        isLatest: req.body.isLatest === 'true' ? true : false,
        description: description || null,
        fileSize: file.size,
        deviceType: deviceType || null,
        isZipExtracted: file.isExtracted || false
      });
      
      firmwareEntries.push({
        id: firmware.id,
        version: firmware.version,
        fileName: firmware.fileName,
        uploadedAt: firmware.uploadedAt,
        isZipExtracted: firmware.isZipExtracted
      });
    }

    return res.status(201).json({
      success: true,
      message: `${firmwareEntries.length} firmware files uploaded successfully`,
      data: firmwareEntries
    });
  } catch (error) {
    console.error("Error uploading firmware:", error);
    return res.status(500).json({ success: false, message: "Error uploading firmware", error: error.message });
  }
};

// Example for getAllFirmware
exports.getAllFirmware = async (req, res) => {

  const baseUrl ='https://roboninjaz.com/api';
  try {
    const firmware = await Firmware.findAll({
      attributes: ['id', 'version', 'fileName', 'uploadedAt', 'isLatest', 'description', 'deviceType', 'isZipExtracted', 'extractPath'],
      order: [['version', 'DESC']]
    });

    // Add download URL to each firmware
    const firmwareWithUrls = firmware.map(fw => ({
      ...fw.toJSON(),
      downloadUrl: `${baseUrl}/firmware/${fw.version}`
    }));

    return res.status(200).json({
      success: true,
      data: firmwareWithUrls
    });
  } catch (error) {
    console.error("Error getting firmware:", error);
    return res.status(500).json({ success: false, message: "Error getting firmware", error: error.message });
  }
};
// Get latest firmware version
exports.getLatestFirmware = async (req, res) => {
  try {
    const deviceType = req.query.deviceType;
    const whereClause = { isLatest: true };
    
    if (deviceType) {
      whereClause.deviceType = deviceType;
    }
    
    const latestFirmware = await Firmware.findAll({
      where: whereClause,
      attributes: ['id', 'version', 'fileName', 'uploadedAt', 'description', 'deviceType', 'isZipExtracted', 'extractPath']
    });

    if (!latestFirmware || latestFirmware.length === 0) {
      return res.status(404).json({ success: false, message: "No firmware found" });
    }

    return res.status(200).json({
      success: true,
      data: latestFirmware
    });
  } catch (error) {
    console.error("Error getting latest firmware:", error);
    return res.status(500).json({ success: false, message: "Error getting latest firmware", error: error.message });
  }
};

// Download firmware file
exports.downloadFirmware = async (req, res) => {
  try {
    const { id } = req.params;
    
    const firmware = await Firmware.findByPk(id);
    
    if (!firmware) {
      return res.status(404).json({ success: false, message: "Firmware not found" });
    }
    
    const filePath = firmware.filePath;
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: "File not found" });
    }
    
    return res.download(filePath, firmware.fileName);
  } catch (error) {
    console.error("Error downloading firmware:", error);
    return res.status(500).json({ success: false, message: "Error downloading firmware", error: error.message });
  }
};

// Get firmware by version
exports.getFirmwareByVersion = async (req, res) => {
  try {
    const { version } = req.params;
    
    const firmware = await Firmware.findAll({
      where: { version },
      attributes: ['id', 'version', 'fileName', 'uploadedAt', 'description', 'deviceType', 'isZipExtracted', 'extractPath']
    });
    
    if (!firmware || firmware.length === 0) {
      return res.status(404).json({ success: false, message: "Firmware not found" });
    }
    
    return res.status(200).json({
      success: true,
      data: firmware
    });
  } catch (error) {
    console.error("Error getting firmware by version:", error);
    return res.status(500).json({ success: false, message: "Error getting firmware by version", error: error.message });
  }
};

// Set a firmware as latest
exports.setLatestFirmware = async (req, res) => {
  try {
    const { id } = req.params;
    
    const firmware = await Firmware.findByPk(id);
    
    if (!firmware) {
      return res.status(404).json({ success: false, message: "Firmware not found" });
    }
    
    // Update all firmware to not be latest
    await Firmware.update({ isLatest: false }, { where: { isLatest: true } });
    
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
        uploadedAt: firmware.uploadedAt
      }
    });
  } catch (error) {
    console.error("Error setting latest firmware:", error);
    return res.status(500).json({ success: false, message: "Error setting latest firmware", error: error.message });
  }
};

module.exports = exports;