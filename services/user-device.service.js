// Import models with associations
const express = require("express");
const { User, Device } = require("../model/associations.model");
const { Op } = require("sequelize");
const sequelize = require("../config/sequelize");
const UserProjectAcquisition = require("../model/user-project-acquisition.model");
const Project = require("../model/project.model");
const fs = require('fs');
const path = require('path');

class DeviceService {
  // Admin creates devices without assigning to users
  async createDeviceByAdmin(deviceData) {
    try {
      // Validate required fields
      const requiredFields = ["deviceName", "deviceType", "serialNumber"];
      for (const field of requiredFields) {
        if (!deviceData[field]) {
          throw new Error(`${field} is required`);
        }
      }

      // Set userId to null for admin-created devices
      const device = await Device.create({
        ...deviceData,
        userId: null,
        updateAvailable: false, // Set initial value
      });

      return device;
    } catch (error) {
      if (error.name === "SequelizeUniqueConstraintError") {
        throw new Error("Serial number must be unique");
      }
      throw new Error(`Failed to create device: ${error.message}`);
    }
  }

  async getDeviceById(deviceId) {
    try {
      const device = await Device.findByPk(deviceId, {
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "username", "email"],
            required: false, // This allows devices without users to be returned
          },
        ],
      });

      return device;
    } catch (error) {
      throw new Error(`Error fetching device: ${error.message}`);
    }
  }

  async getDeviceBySerialNumber(serialNumber) {
    try {
      const device = await Device.findOne({
        where: { serialNumber },
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "username", "email"],
            required: false, // This allows devices without users to be returned
          },
        ],
      });

      return device;
    } catch (error) {
      throw new Error(`Error fetching device: ${error.message}`);
    }
  }

  // Get device with current claiming user info
  async getDeviceWithClaimInfo(serialNumber) {
    try {
      const device = await Device.findOne({
        where: { serialNumber },
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "username", "email"],
            required: false,
          },
        ],
      });

      if (!device) {
        return null;
      }

      // Return device info with claim status
      return {
        id: device.id,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        serialNumber: device.serialNumber,
        firmwareVersion: device.firmwareVersion,
        updateAvailable: device.updateAvailable,
        lastUpdated: device.lastUpdated,
        createdAt: device.createdAt,
        isClaimed: !!device.userId,
        claimedBy: device.user
          ? {
              id: device.user.id,
              username: device.user.username,
              email: device.user.email,
            }
          : null,
      };
    } catch (error) {
      throw new Error(`Error fetching device: ${error.message}`);
    }
  }

 async removeDeviceClaim(deviceId) {
    // Start a transaction to ensure both actions happen, or neither happens
    const transaction = await sequelize.transaction();

    try {
      const device = await Device.findByPk(deviceId, { transaction });

      if (!device) {
        throw new Error("Device not found");
      }

      // 1. Mark all projects on this device as "removed"
      // This ensures the next user starts with 0/5 slots used
      await UserProjectAcquisition.update(
        { hasRemovalOccurred: true }, // Set the flag that your count logic likely checks
        {
          where: {
            deviceId: deviceId,
            hasRemovalOccurred: false // Only update active ones
          },
          transaction
        }
      );



      // 2. Remove the user claim
      device.userId = null;
      device.lastUpdated = new Date();

      await device.save({ transaction });

      await transaction.commit();

      return device;
    } catch (error) {
      await transaction.rollback();
      throw new Error(`Error removing device claim: ${error.message}`);
    }
  }

  // User claims a device by serial number
  async claimDeviceByUser(serialNumber, userId, nickName) {
    try {
      // Find device by serial number
      const device = await Device.findOne({
        where: { serialNumber },
      });

      if (!device) {
        throw new Error("Device not found with the provided serial number");
      }

      // Check if user has already claimed this specific device
      const alreadyClaimed = await Device.findOne({
        where: {
          userId,
          id: device.id,
        },
      });

      if (alreadyClaimed) {
        throw new Error("You have already claimed this device");
      }

      // // Check if user has reached max devices (5)
      // const userDeviceCount = await Device.count({
      //   where: { userId },
      // });

      // if (userDeviceCount >= 5) {
      //   throw new Error("You have reached the maximum limit of 5 devices");
      // }

      // Assign device to user
      device.userId = userId;
      if (!nickName) {
        nickName = device.deviceName; // Use device name as default nickname if not provided
      } else {
        device.nickName = nickName;
      }

      device.lastUpdated = new Date();
      await device.save();

      return device;
    } catch (error) {
      throw new Error(`Failed to claim device: ${error.message}`);
    }
  }

  async getDevices(options = {}) {
    try {
      const page = Math.max(1, parseInt(options.page) || 1);
      const limit = Math.max(1, parseInt(options.limit) || 10);
      const { search, deviceType, userId, onlyUnassigned, updateAvailable } = options;

      const whereConditions = {};

      if (search) {
        whereConditions[Op.or] = [
          { deviceName: { [Op.like]: `%${search}%` } },
          { serialNumber: { [Op.like]: `%${search}%` } },
        ];
      }

      if (deviceType) {
        whereConditions.deviceType = deviceType;
      }

      if (userId) {
        whereConditions.userId = userId;
      }

      if (onlyUnassigned) {
        whereConditions.userId = null;
      }

      if (updateAvailable !== undefined) {
        whereConditions.updateAvailable = updateAvailable === 'true';
      }

      const offset = (page - 1) * limit;

      const { count, rows } = await Device.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "username", "email"],
            required: false,
          },
        ],
        limit: limit,
        offset: offset,
        order: [["createdAt", "DESC"]],
      });

      return {
        devices: rows,
        totalDevices: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
      };
    } catch (error) {
      throw new Error(`Error fetching devices: ${error.message}`);
    }
  }

  async getUserDevices(userId) {
    try {
      const devices = await Device.findAll({
        where: { userId },
        attributes: [
          'id', 'deviceName', 'deviceType', 'serialNumber', 
          'firmwareVersion', 'nickName', 'updateAvailable', 
          'isModified', 'lastUpdated', 'createdAt'
        ]
      });

      return devices;
    } catch (error) {
      throw new Error(`Error fetching user devices: ${error.message}`);
    }
  }

  async updateDevice(deviceId, updateData) {
    const device = await Device.findByPk(deviceId);

    if (!device) {
      throw new Error("Device not found");
    }

    // Prevent updating serialNumber if it already exists
    if (
      updateData.serialNumber &&
      updateData.serialNumber !== device.serialNumber
    ) {
      const existingDevice = await Device.findOne({
        where: { serialNumber: updateData.serialNumber },
      });
      if (existingDevice) {
        throw new Error("Serial number already exists");
      }
    }

    // Update lastUpdated timestamp
    updateData.lastUpdated = new Date();

    const updatedDevice = await device.update(updateData);
    return updatedDevice;
  }

  async deleteDeviceByAdmin(deviceId) {
    const transaction = await sequelize.transaction();

    try {
      const device = await Device.findByPk(deviceId, { transaction });
      if (!device) {
        throw new Error("Device not found");
      }

      // Get all acquisitions for reporting purposes (optional)
      const allAcquisitions = await UserProjectAcquisition.findAll({
        where: {
          deviceId: deviceId,
        },
        include: [
          {
            model: Project,
            as: "project",
            attributes: ["id", "name"],
          },
          {
            model: User,
            as: "user",
            attributes: ["id", "username", "email"],
          },
        ],
        transaction,
      });

      // Force delete ALL acquisitions (both active and removed)
      await UserProjectAcquisition.destroy({
        where: {
          deviceId: deviceId,
        },
        force: true, // Hard delete - bypasses soft delete
        transaction,
      });

      // Delete the device
      await device.destroy({ transaction });

      await transaction.commit();

      return {
        success: true,
        deletedDevice: {
          id: device.id,
          deviceName: device.deviceName,
          serialNumber: device.serialNumber,
          deviceType: device.deviceType,
          userId: device.userId,
        },
        deletedAcquisitions: {
          total: allAcquisitions.length,
          active: allAcquisitions.filter((acq) => !acq.hasRemovalOccurred)
            .length,
          removed: allAcquisitions.filter((acq) => acq.hasRemovalOccurred)
            .length,
        },
        message: `Device deleted along with ${allAcquisitions.length} project acquisitions`,
      };
    } catch (error) {
      // Only rollback if transaction is still active
      if (!transaction.finished) {
        await transaction.rollback();
      }
      throw error;
    }
  }

  async getIsDeviceModified(serialNumber, reset) {
    try {
      const device = await Device.findOne({
        where: { serialNumber },
      });

      if (!device) {
        throw new Error("Device not found with the provided serial number");
      }

      if (reset == "true") {
        // Reset isModified status to false
        device.isModified = false;
        await device.save();
      }
      // Return device info with modification and update status
      return {
        id: device.id,
        serialNumber: device.serialNumber,
        isModified: device.isModified,
        updateAvailable: device.updateAvailable,
      };
    } catch (error) {
      throw new Error(`Error fetching device: ${error.message}`);
    }
  }

  async updateDeviceNicknameBySerial(serialNumber, userId, newNickname) {
    try {
      // Find device by serial number
      const device = await Device.findOne({
        where: { serialNumber },
      });

      if (!device) {
        throw new Error("Device not found with the provided serial number");
      }

      // Check if device belongs to the user
      if (!device.userId || device.userId !== userId) {
        throw new Error(
          "You can only update nickname for devices you have claimed"
        );
      }

      // Validate nickname
      if (!newNickname || newNickname.trim().length === 0) {
        throw new Error("Nickname cannot be empty");
      }

      if (newNickname.length > 50) {
        throw new Error("Nickname cannot exceed 50 characters");
      }

      // Update the nickname
      device.nickName = newNickname.trim();
      device.lastUpdated = new Date();

      await device.save();

      return device;
    } catch (error) {
      throw new Error(`Failed to update device nickname: ${error.message}`);
    }
  }

  // New methods for update availability management
  async markDevicesUpdateAvailable(deviceType, serialNumbers = null) {
    try {
      let whereClause = {};
      
      if (serialNumbers && serialNumbers.length > 0) {
        whereClause.serialNumber = { [Op.in]: serialNumbers };
        if (deviceType) {
          whereClause.deviceType = deviceType;
        }
      } else if (deviceType) {
        whereClause.deviceType = deviceType;
      } else {
        throw new Error("Either deviceType or serialNumbers must be provided");
      }

      const [updatedCount] = await Device.update(
        { updateAvailable: true },
        { where: whereClause }
      );

      return { updatedCount, deviceType, serialNumbers };
    } catch (error) {
      throw new Error(`Error marking devices as having updates: ${error.message}`);
    }
  }

  async clearDevicesUpdateAvailable(deviceType, serialNumbers = null) {
    try {
      let whereClause = {};
      
      if (serialNumbers && serialNumbers.length > 0) {
        whereClause.serialNumber = { [Op.in]: serialNumbers };
        if (deviceType) {
          whereClause.deviceType = deviceType;
        }
      } else if (deviceType) {
        whereClause.deviceType = deviceType;
      } else {
        throw new Error("Either deviceType or serialNumbers must be provided");
      }

      const [updatedCount] = await Device.update(
        { updateAvailable: false },
        { where: whereClause }
      );

      return { updatedCount, deviceType, serialNumbers };
    } catch (error) {
      throw new Error(`Error clearing device update flags: ${error.message}`);
    }
  }

  async getDevicesWithUpdateAvailable(deviceType = null, userId = null) {
    try {
      let whereClause = { updateAvailable: true };
      
      if (deviceType) {
        whereClause.deviceType = deviceType;
      }
      
      if (userId) {
        whereClause.userId = userId;
      }

      const devices = await Device.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "username", "email"],
            required: false,
          },
        ],
        attributes: [
          'id', 'serialNumber', 'deviceType', 'deviceName', 
          'nickName', 'firmwareVersion', 'updateAvailable', 'userId'
        ],
        order: [['deviceType', 'ASC'], ['deviceName', 'ASC']]
      });

      return devices;
    } catch (error) {
      throw new Error(`Error fetching devices with updates: ${error.message}`);
    }
  }

  async updateDeviceUpdateFlag(serialNumber, updateAvailable) {
    try {
      const device = await Device.findOne({
        where: { serialNumber }
      });

      if (!device) {
        throw new Error("Device not found with the provided serial number");
      }

      device.updateAvailable = updateAvailable;
      device.lastUpdated = new Date();
      await device.save();

      return device;
    } catch (error) {
      throw new Error(`Error updating device update flag: ${error.message}`);
    }
  }

  // Get device statistics including update counts
  async getDeviceStats() {
    try {
      const totalDevices = await Device.count();
      const claimedDevices = await Device.count({
        where: { userId: { [Op.ne]: null } }
      });
      const devicesWithUpdates = await Device.count({
        where: { updateAvailable: true }
      });

      const devicesByType = await Device.findAll({
        attributes: [
          'deviceType',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('SUM', sequelize.literal('CASE WHEN update_available = true THEN 1 ELSE 0 END')), 'updatesAvailable']
        ],
        group: ['deviceType'],
        raw: true
      });

      return {
        totalDevices,
        claimedDevices,
        unclaimedDevices: totalDevices - claimedDevices,
        devicesWithUpdates,
        devicesByType
      };
    } catch (error) {
      throw new Error(`Error fetching device stats: ${error.message}`);
    }
  }


   getBaseUrl() {
    return process.env.BASE_URL || "https://dev.roboninjaz.com";
  }



  async uploadDeviceAvatar(deviceId, file) {
    try {
      if (!file) {
        throw new Error("No file provided");
      }

      const device = await Device.findByPk(deviceId);

      if (!device) {
        throw new Error("Device not found");
      }

      // Create device-specific directory
      const deviceUploadsDir = path.join(
        __dirname,
        '../uploads/devices',
        deviceId.toString()
      );

      if (!fs.existsSync(deviceUploadsDir)) {
        fs.mkdirSync(deviceUploadsDir, { recursive: true });
      }

      // Delete old avatar if exists
      if (device.device_avatar) {
        const oldFilename = device.device_avatar.split('/').pop();
        const oldAvatarPath = path.join(deviceUploadsDir, oldFilename);

        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath);
        }
      }

      // Move file from temp directory to device directory
      const tempPath = file.path;
      const newPath = path.join(deviceUploadsDir, file.filename);

      fs.renameSync(tempPath, newPath);

      // Store relative path in database
      const avatarPath = `uploads/devices/${deviceId}/${file.filename}`;

      await device.update({ device_avatar: avatarPath });

      // Get full URL
      const baseUrl = this.getBaseUrl();
      const publicUrl = `${baseUrl}/${avatarPath}`;

      return {
        success: true,
        message: "Device avatar uploaded successfully",
        deviceAvatar: avatarPath,
        publicUrl: publicUrl  // ✅ Full URL
      };
    } catch (error) {
      // Clean up uploaded file if there's an error
      if (file && file.path && fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
        } catch (deleteError) {
          console.error("Error deleting temp file:", deleteError);
        }
      }
      throw error;
    }
  }


  /**
   * Get device avatar
   */
  async getDeviceAvatar(deviceId) {
    try {
      const device = await Device.findByPk(deviceId, {
        attributes: ["id", "deviceName", "device_avatar"]
      });

      if (!device) {
        throw new Error("Device not found");
      }

      if (!device.device_avatar) {
        return {
          success: false,
          message: "No avatar found for this device",
          deviceAvatar: null,
          publicUrl: null
        };
      }

      // Get full URL
      const baseUrl = this.getBaseUrl();
      const publicUrl = `${baseUrl}/${device.device_avatar}`;

      return {
        success: true,
        deviceAvatar: device.device_avatar,
        publicUrl: publicUrl  // ✅ Full URL
      };
    } catch (error) {
      throw error;
    }
  }


  /**
   * Delete device avatar
   */
async deleteDeviceAvatar(deviceId) {
  try {
    const device = await Device.findByPk(deviceId);

    if (!device) {
      throw new Error("Device not found");
    }

    if (!device.deviceAvatar) {
      throw new Error("No avatar to delete");
    }

    // Delete file from storage
    const deviceUploadsDir = path.join(
      __dirname,
      '../uploads/devices',
      deviceId.toString()
    );
    const filename = device.deviceAvatar.split('/').pop();
    const avatarPath = path.join(deviceUploadsDir, filename);

    if (fs.existsSync(avatarPath)) {
      fs.unlinkSync(avatarPath);
    }

    // Update device record
    await device.update({ deviceAvatar: null });

    return {
      success: true,
      message: "Device avatar deleted successfully",
    };
  } catch (error) {
    throw error;
  }
}


  // ============== EXTRA DATA METHODS ==============

  /**
   * Set/Update extradata field
   */
  async updateExtraData(deviceId, fieldName, data) {
    try {
      if (!["extradata1", "extradata2", "extradata3"].includes(fieldName)) {
        throw new Error("Invalid field name. Must be extradata1, extradata2, or extradata3");
      }

      const device = await Device.findByPk(deviceId);

      if (!device) {
        throw new Error("Device not found");
      }

      // Validate data is JSON serializable
      if (data !== null && typeof data === "object") {
        try {
          JSON.stringify(data);
        } catch (e) {
          throw new Error("Data must be JSON serializable");
        }
      }

      await device.update({ [fieldName]: data });

      return {
        success: true,
        message: `${fieldName} updated successfully`,
        [fieldName]: data,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get single extradata field
   */
  async getExtraData(deviceId, fieldName) {
    try {
      if (!["extradata1", "extradata2", "extradata3"].includes(fieldName)) {
        throw new Error("Invalid field name. Must be extradata1, extradata2, or extradata3");
      }

      const device = await Device.findByPk(deviceId, {
        attributes: ["id", fieldName]
      });

      if (!device) {
        throw new Error("Device not found");
      }

      return {
        success: true,
        [fieldName]: device[fieldName] || null,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all extradata fields
   */
  async getAllExtraData(deviceId) {
    try {
      const device = await Device.findByPk(deviceId, {
        attributes: ["id", "extradata1", "extradata2", "extradata3"]
      });

      if (!device) {
        throw new Error("Device not found");
      }

      return {
        success: true,
        extradata1: device.extradata1 || null,
        extradata2: device.extradata2 || null,
        extradata3: device.extradata3 || null,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete single extradata field
   */
  async deleteExtraData(deviceId, fieldName) {
    try {
      if (!["extradata1", "extradata2", "extradata3"].includes(fieldName)) {
        throw new Error("Invalid field name. Must be extradata1, extradata2, or extradata3");
      }

      const device = await Device.findByPk(deviceId);

      if (!device) {
        throw new Error("Device not found");
      }

      if (!device[fieldName]) {
        throw new Error(`${fieldName} is already empty`);
      }

      await device.update({ [fieldName]: null });

      return {
        success: true,
        message: `${fieldName} deleted successfully`,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Merge/Update nested data in extradata field
   */
  async mergeExtraData(deviceId, fieldName, dataToMerge) {
    try {
      if (!["extradata1", "extradata2", "extradata3"].includes(fieldName)) {
        throw new Error("Invalid field name. Must be extradata1, extradata2, or extradata3");
      }

      const device = await Device.findByPk(deviceId);

      if (!device) {
        throw new Error("Device not found");
      }

      // Get current data
      const currentData = device[fieldName] || {};

      // Merge with new data
      const mergedData = { ...currentData, ...dataToMerge };

      await device.update({ [fieldName]: mergedData });

      return {
        success: true,
        message: `${fieldName} merged successfully`,
        [fieldName]: mergedData,
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new DeviceService();