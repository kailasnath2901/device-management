const DeviceService = require("../services/user-device.service");

class DeviceController {
  async createDeviceByAdmin(req, res) {
    try {
      // Admin creates devices without userId
      const deviceData = req.body;

      // Check if the user is an admin
      if (req.user.role !== "admin" && req.user.role !== "super_") {
        return res.status(403).json({
          success: false,
          message: "Only admins can create devices",
        });
      }

      const device = await DeviceService.createDeviceByAdmin(deviceData);

      res.status(201).json({
        success: true,
        device,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async claimDevice(req, res) {
    try {
      const { serialNumber, nickName } = req.body;

      // const { serialNumber } = req.body;
      const userId = req.user.id;

      if (!serialNumber) {
        return res.status(400).json({
          success: false,
          message: "Serial number is required",
        });
      }

      // Get device with current claim information
      const deviceInfo = await DeviceService.getDeviceWithClaimInfo(
        serialNumber
      );

      if (!deviceInfo) {
        return res.status(404).json({
          success: false,
          message: "Device not found",
        });
      }

      // Check if device is already claimed by another user
      // if (deviceInfo.isClaimed && deviceInfo.claimedBy.id !== userId) {
      //   return res.status(400).json({
      //     success: false,
      //     message: `Device is already claimed by user: ${deviceInfo.claimedBy.username} (${deviceInfo.claimedBy.email})`,
      //     claimedBy: deviceInfo.claimedBy
      //   });
      // }
      if (deviceInfo.isClaimed && deviceInfo.claimedBy.id !== userId) {
        return res.status(400).json({
          success: false,
          message: `Device is already claimed by user: ${deviceInfo.claimedBy.username}`,
        });
      }
      // Check if device is already claimed by the same user
      if (deviceInfo.isClaimed && deviceInfo.claimedBy.id === userId) {
        return res.status(400).json({
          success: false,
          message: "Device is already claimed by you",
          device: deviceInfo,
        });
      }

      // Claim the device
      const device = await DeviceService.claimDeviceByUser(
        serialNumber,
        userId,
        nickName
      );

      res.json({
        success: true,
        message: "Device claimed successfully",
        device,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async checkDeviceStatus(req, res) {
    try {
      const { serialNumber } = req.params;

      const deviceInfo = await DeviceService.getDeviceWithClaimInfo(
        serialNumber
      );

      if (!deviceInfo) {
        return res.status(404).json({
          success: false,
          message: "Device not found",
        });
      }

      res.json({
        success: true,
        device: deviceInfo,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async removeClaimedDevice(req, res) {
    try {
      const { deviceId } = req.params;
      const userId = req.user.id;

      // Get the device to check ownership
      const device = await DeviceService.getDeviceById(deviceId);

      if (!device) {
        return res.status(404).json({
          success: false,
          message: "Device not found",
        });
      }

      // Check if the device is claimed by the current user
      if (!device.userId || device.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: "You can only remove devices that you have claimed",
        });
      }

      // Remove the claim (set userId to null)
      const updatedDevice = await DeviceService.removeDeviceClaim(deviceId);

      const deviceResponse = {
        deviceName: updatedDevice.deviceName,
        deviceType: updatedDevice.deviceType,
        serialNumber: updatedDevice.serialNumber,
      };

      res.json({
        success: true,
        message: "Device claim removed successfully",
        device: deviceResponse,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
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
        total: devices.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getDevices(req, res) {
    try {
      const { page, limit, search, deviceType, onlyUnassigned } = req.query;

      // Only admins can see all devices
      if (req.user.role !== "admin" && req.user.role !== "super_admin") {
        return res.status(403).json({
          success: false,
          message: "Only admins can see all devices",
        });
      }

      const devices = await DeviceService.getDevices({
        page,
        limit,
        search,
        deviceType,
        onlyUnassigned: onlyUnassigned === "true",
      });

      res.json({
        success: true,
        ...devices,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async updateDevice(req, res) {
    try {
      const { deviceId } = req.params;
      const updateData = req.body;

      // Only admins can update devices
      if (req.user.role !== "admin" && req.user.role !== "super_admin") {
        return res.status(403).json({
          success: false,
          message: "Only admins can update devices",
        });
      }

      const device = await DeviceService.updateDevice(deviceId, updateData);

      res.json({
        success: true,
        device,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async deleteDeviceByAdmin(req, res) {
    try {
      const { deviceId } = req.params;

      // Only admins can delete devices
      if (req.user.role !== "admin" && req.user.role !== "super_admin") {
        return res.status(403).json({
          success: false,
          message: "Only admins can delete devices",
        });
      }

      await DeviceService.deleteDeviceByAdmin(deviceId);

      res.json({
        success: true,
        message: "Device deleted successfully",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
  //!-----Check the user added or removed any projects--------------
  async getIsModified(req, res) {
    try {
      const { serialNumber } = req.body;
      const { reset } = req.body;

      const isModified = await DeviceService.getIsDeviceModified(
        serialNumber,
        reset
      );

      if (!serialNumber) {
        return res.status(404).json({
          success: false,
          message: "Provide a 'serialNumber' to check modification status",
        });
      }

      if (!isModified) {
        return res.status(404).json({
          success: false,
          message: "Error fetching device data",
        });
      }

      res.json({
        success: true,
        ...isModified,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
  //!--------------------------------------------
}

module.exports = new DeviceController();
