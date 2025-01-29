const DeviceService = require('../services/user-device.service');

class DeviceController {
  async addDevice(req, res) {
    try {
        const { userId } = req.params;
        const device = await DeviceService.addDevice(
          userId, 
          req.body
        );
        res.status(201).json({
          success: true,
          device
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          message: error.message
        });
      }
  }

  async assignDeviceToUser(req, res) {
    try {
      const { userId, deviceName, deviceType, serialNumber } = req.body;
  
      const device = await DeviceService.addDevice(userId, {
        deviceName,
        deviceType,
        serialNumber
      });
  
      res.status(201).json({
        success: true,
        device
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async getUserDevices(req, res) {
    try {
      const devices = await DeviceService.getUserDevices(req.user.id);
      res.json({
        success: true,
        devices
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async updateDeviceFirmware(req, res) {
    try {
      const { deviceId } = req.params;
      const { firmwareVersion } = req.body;
  
      const device = await DeviceService.updateDeviceFirmware(
        deviceId,
        firmwareVersion,
        req.user.role  // Pass the user role to the service
      );
  
      res.json({
        success: true,
        device
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async getAllDevices(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search, 
        deviceType 
      } = req.query;
      
      const devices = await DeviceService.getAllDevices({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
        deviceType
      });

      res.json({
        success: true,
        ...devices
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  async updateDevice(req, res) {
    try {
      const { deviceId } = req.params;
      const device = await DeviceService.updateDevice(
        deviceId, 
        req.user.id, 
        req.body
      );

      res.json({
        success: true,
        device
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new DeviceController();