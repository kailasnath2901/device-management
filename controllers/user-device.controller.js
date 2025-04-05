const DeviceService = require('../services/user-device.service');

class DeviceController {
  async createDeviceByAdmin(req, res) {
    try {
      // Admin creates devices without userId
      const deviceData = req.body;
      
      // Check if the user is an admin
      if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          message: "Only admins can create devices"
        });
      }
      
      const device = await DeviceService.createDeviceByAdmin(deviceData);
      
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

  async claimDevice(req, res) {
    try {
      const { serialNumber } = req.body;
      const userId = req.user.id;
      
      if (!serialNumber) {
        return res.status(400).json({
          success: false,
          message: "Serial number is required"
        });
      }
      
      const device = await DeviceService.claimDeviceByUser(serialNumber, userId);
      
      res.json({
        success: true,
        message: "Device claimed successfully",
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
      const userId = req.user.id;
      
      const devices = await DeviceService.getUserDevices(userId);
      
      res.json({
        success: true,
        devices,
        total: devices.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getDevices(req, res) {
    try {
      const { page, limit, search, deviceType, onlyUnassigned } = req.query;
      
      // Only admins can see all devices
      if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          message: "Only admins can see all devices"
        });
      }

      const devices = await DeviceService.getDevices({
        page,
        limit,
        search,
        deviceType,
        onlyUnassigned: onlyUnassigned === 'true'
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
      const updateData = req.body;
      
      // Only admins can update devices
      if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          message: "Only admins can update devices"
        });
      }
      
      const device = await DeviceService.updateDevice(deviceId, updateData);

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

  async deleteDeviceByAdmin(req, res) {
    try {
      const { deviceId } = req.params;
      
      // Only admins can delete devices
      if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          message: "Only admins can delete devices"
        });
      }
      
      await DeviceService.deleteDeviceByAdmin(deviceId);
      
      res.json({
        success: true,
        message: "Device deleted successfully"
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