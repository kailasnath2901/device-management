const DeviceService = require('../services/user-device.service');

class DeviceController {
  async createDeviceByAdmin(req, res) {
    try {
      const deviceData = req.body;
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

  async getDevices(req, res) {
    try {
      const { page, limit, search, deviceType } = req.query;

      const devices = await DeviceService.getDevices({
        page,
        limit,
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
      const updateData = req.body;
      
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