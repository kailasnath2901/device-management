const Device = require('../model/user-device.model');
const { Op } = require('sequelize');

class DeviceService {
  async createDeviceByAdmin(deviceData) {
    try {
      // Validate required fields
      const requiredFields = ['deviceName', 'deviceType', 'serialNumber'];
      for (const field of requiredFields) {
        if (!deviceData[field]) {
          throw new Error(`${field} is required`);
        }
      }

      const device = await Device.create(deviceData);
      return device;
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new Error('Serial number must be unique');
      }
      throw new Error(`Failed to create device: ${error.message}`);
    }
  }

  async getDevices(options = {}) {
    try {
      // Ensure values are valid numbers or use defaults
      const page = Math.max(1, parseInt(options.page) || 1);
      const limit = Math.max(1, parseInt(options.limit) || 10);
      const { search, deviceType } = options;

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