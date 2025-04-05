const Device = require('../model/user-device.model');
const { Op } = require('sequelize');

class DeviceService {
  // Admin creates devices without assigning to users
  async createDeviceByAdmin(deviceData) {
    try {
      // Validate required fields
      const requiredFields = ['deviceName', 'deviceType', 'serialNumber'];
      for (const field of requiredFields) {
        if (!deviceData[field]) {
          throw new Error(`${field} is required`);
        }
      }

      // Set userId to null for admin-created devices
      // They will be assigned to users later
      const device = await Device.create({
        ...deviceData,
        userId: null // Explicitly set to null for now
      });
      
      return device;
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new Error('Serial number must be unique');
      }
      throw new Error(`Failed to create device: ${error.message}`);
    }
  }

  // User claims a device by serial number
  async claimDeviceByUser(serialNumber, userId) {
    try {
      // Find device by serial number
      const device = await Device.findOne({
        where: { serialNumber }
      });
      
      if (!device) {
        throw new Error('Device not found with the provided serial number');
      }
      
      // Check if device is already claimed
      if (device.userId) {
        throw new Error('This device has already been claimed by a user');
      }
      
      // Check if user has reached max devices (5)
      const userDeviceCount = await Device.count({
        where: { userId }
      });
      
      if (userDeviceCount >= 5) {
        throw new Error('You have reached the maximum limit of 5 devices');
      }
      
      // Assign device to user
      device.userId = userId;
      device.lastUpdated = new Date();
      await device.save();
      
      return device;
    } catch (error) {
      throw new Error(`Failed to claim device: ${error.message}`);
    }
  }

  async getDevices(options = {}) {
    try {
      // Ensure values are valid numbers or use defaults
      const page = Math.max(1, parseInt(options.page) || 1);
      const limit = Math.max(1, parseInt(options.limit) || 10);
      const { search, deviceType, userId, onlyUnassigned } = options;

      const whereConditions = {};
      
      if (search) {
        whereConditions[Op.or] = [
          { deviceName: { [Op.like]: `%${search}%` } },
          { serialNumber: { [Op.like]: `%${search}%` } }
        ];
      }
      
      if (deviceType) {
        whereConditions.deviceType = deviceType;
      }
      
      // Filter by userId if provided
      if (userId) {
        whereConditions.userId = userId;
      }
      
      // Filter only unassigned devices if requested
      if (onlyUnassigned) {
        whereConditions.userId = null;
      }

      const offset = (page - 1) * limit;

      const { count, rows } = await Device.findAndCountAll({
        where: whereConditions,
        limit: limit,
        offset: offset,
        order: [['createdAt', 'DESC']]
      });

      return {
        devices: rows,
        totalDevices: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page
      };
    } catch (error) {
      throw new Error(`Error fetching devices: ${error.message}`);
    }
  }

  async getUserDevices(userId) {
    try {
      const devices = await Device.findAll({
        where: { userId }
      });
      
      return devices;
    } catch (error) {
      throw new Error(`Error fetching user devices: ${error.message}`);
    }
  }

  async updateDevice(deviceId, updateData) {
    const device = await Device.findByPk(deviceId);
    
    if (!device) {
      throw new Error('Device not found');
    }

    // Prevent updating serialNumber if it already exists
    if (updateData.serialNumber && updateData.serialNumber !== device.serialNumber) {
      const existingDevice = await Device.findOne({
        where: { serialNumber: updateData.serialNumber }
      });
      if (existingDevice) {
        throw new Error('Serial number already exists');
      }
    }

    // Update lastUpdated timestamp
    updateData.lastUpdated = new Date();

    const updatedDevice = await device.update(updateData);
    return updatedDevice;
  }

  async deleteDeviceByAdmin(deviceId) {
    const device = await Device.findByPk(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }
    await device.destroy();
    return true;
  }
}

module.exports = new DeviceService();