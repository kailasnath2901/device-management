// Import models with associations
const e = require('express');
const { User, Device } = require('../model/associations.model');
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
      const device = await Device.create({
        ...deviceData,
        userId: null
      });
      
      return device;
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new Error('Serial number must be unique');
      }
      throw new Error(`Failed to create device: ${error.message}`);
    }
  }

  async getDeviceById(deviceId) {
    try {
      const device = await Device.findByPk(deviceId, {
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email'],
          required: false // This allows devices without users to be returned
        }]
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
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email'],
          required: false // This allows devices without users to be returned
        }]
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
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email'],
          required: false
        }]
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
        lastUpdated: device.lastUpdated,
        createdAt: device.createdAt,
        isClaimed: !!device.userId,
        claimedBy: device.user ? {
          id: device.user.id,
          username: device.user.username,
          email: device.user.email
        } : null
      };
    } catch (error) {
      throw new Error(`Error fetching device: ${error.message}`);
    }
  }

  async removeDeviceClaim(deviceId) {
    try {
      const device = await Device.findByPk(deviceId);
      
      if (!device) {
        throw new Error('Device not found');
      }
      
      // Set userId to null to remove the claim
      device.userId = null;
      device.lastUpdated = new Date();
      
      await device.save();
      
      return device;
    } catch (error) {
      throw new Error(`Error removing device claim: ${error.message}`);
    }
  }

  // User claims a device by serial number
  async claimDeviceByUser(serialNumber, userId,nickName) {
    try {
      // Find device by serial number
      const device = await Device.findOne({
        where: { serialNumber }
      });
      
      if (!device) {
        throw new Error('Device not found with the provided serial number');
      }
      
      // Check if user has already claimed this specific device
      const alreadyClaimed = await Device.findOne({
        where: {
          userId,
          id: device.id
        }
      });

      if (alreadyClaimed) {
        throw new Error('You have already claimed this device');
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
      if (!nickName) {
        nickName = device.deviceName; // Use device name as default nickname if not provided
      }else { 
         device.nickName = nickName

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
      
      if (userId) {
        whereConditions.userId = userId;
      }
      
      if (onlyUnassigned) {
        whereConditions.userId = null;
      }

      const offset = (page - 1) * limit;

      const { count, rows } = await Device.findAndCountAll({
        where: whereConditions,
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email'],
          required: false
        }],
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
   async getIsDeviceModified(serialNumber,reset) {
    try {
     
      const device = await Device.findOne({
        where: { serialNumber }
      });
      
      if (!device) {
        throw new Error('Device not found with the provided serial number');
      }

      if (reset=="true") {
        // Reset isModified status to false
        device.isModified = false;
        await device.save();
      }
      // Return device info with claim status
      return {
        id: device.id,
        serialNumber: device.serialNumber,
        isModified: device.isModified
       
      };
    } catch (error) {
      throw new Error(`Error fetching device-: ${error.message}`);
    }
  }

  async updateDeviceNicknameBySerial(serialNumber, userId, newNickname) {
  try {
    // Find device by serial number
    const device = await Device.findOne({
      where: { serialNumber }
    });
    
    if (!device) {
      throw new Error('Device not found with the provided serial number');
    }
    
    // Check if device belongs to the user
    if (!device.userId || device.userId !== userId) {
      throw new Error('You can only update nickname for devices you have claimed');
    }
    
    // Validate nickname
    if (!newNickname || newNickname.trim().length === 0) {
      throw new Error('Nickname cannot be empty');
    }
    
    if (newNickname.length > 50) {
      throw new Error('Nickname cannot exceed 50 characters');
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

}

module.exports = new DeviceService();