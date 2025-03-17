const Firmware = require("../model/file-firmware.model");
const fs = require("fs");
const path = require("path");
const { Op } = require("sequelize");

// Upload firmware file
exports.uploadFirmware = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
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
      // Don't overwrite - create a new entry
      console.log(`Firmware version ${version} already exists, creating new entry`);
    }

    // If this is the first firmware or marked as latest, update all others to not be latest
    if (req.body.isLatest === 'true' || !(await Firmware.findOne({ where: { isLatest: true } }))) {
      await Firmware.update({ isLatest: false }, { where: { isLatest: true } });
    }

    // Create new firmware entry
    const firmware = await Firmware.create({
      version,
      fileName: req.file.filename,
      filePath: req.file.path,
      isLatest: req.body.isLatest === 'true' ? true : false,
      description: description || null,
      fileSize: req.file.size,
      deviceType: deviceType || null,
    });

    return res.status(201).json({
      success: true,
      message: "Firmware uploaded successfully",
      data: {
        id: firmware.id,
        version: firmware.version,
        fileName: firmware.fileName,
        uploadedAt: firmware.uploadedAt,
      }
    });
  } catch (error) {
    console.error("Error uploading firmware:", error);
    return res.status(500).json({ success: false, message: "Error uploading firmware", error: error.message });
  }
};

// Get all firmware versions
exports.getAllFirmware = async (req, res) => {
  try {
    const firmware = await Firmware.findAll({
      attributes: ['id', 'version', 'fileName', 'uploadedAt', 'isLatest', 'description', 'deviceType'],
      order: [['version', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: firmware
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
    
    const latestFirmware = await Firmware.findOne({
      where: whereClause,
      attributes: ['id', 'version', 'fileName', 'uploadedAt', 'description', 'deviceType']
    });

    if (!latestFirmware) {
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
      attributes: ['id', 'version', 'fileName', 'uploadedAt', 'description', 'deviceType']
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