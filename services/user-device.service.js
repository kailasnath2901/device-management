const { Op1 } = require("sequelize");
const Device = require("../model/user-device.model");
const User = require("../model/user.model");

class DeviceService {
  async addDevice(userId, deviceData) {
    return await Device.create({
      ...deviceData,
      userId,
      lastUpdated: new Date(),
    });
  }

  async getAllDevices({ page, limit, search, deviceType }) {
    const offset = (page - 1) * limit;
    const whereClause = {};

    if (search) {
      whereClause[Op1.or] = [
        { deviceName: { [Op1.like]: `%${search}%` } },
        { serialNumber: { [Op1.like]: `%${search}%` } },
      ];
    }

    if (deviceType) {
      whereClause.deviceType = deviceType;
    }

    const { count, rows } = await Device.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "user", // Added the alias here
          attributes: ["id", "username", "email"],
        },
      ],
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      attributes: [
        "id",
        "deviceName",
        "deviceType",
        "serialNumber",
        "firmwareVersion",
        "lastUpdated",
        "createdAt",
      ],
    });

    const devices = rows.map((device) => ({
      id: device.id,
      deviceName: device.deviceName,
      deviceType: device.deviceType,
      serialNumber: device.serialNumber,
      firmwareVersion: device.firmwareVersion,
      lastUpdated: device.lastUpdated,
      createdAt: device.createdAt,
      user: device.user
        ? {
            // Changed from User to user to match alias
            id: device.user.id,
            username: device.user.username,
            email: device.user.email,
          }
        : null,
    }));

    return {
      devices,
      totalDevices: count,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      itemsPerPage: limit,
    };
  }

  async getUserDevices(userId) {
    return await Device.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
    });
  }

  async updateDeviceFirmware(deviceId, newFirmwareVersion, userRole) {
    let device;
    
    if (userRole === 'admin' || userRole === 'super_admin') {
      // Admin can update any device
      device = await Device.findOne({
        where: {
          id: deviceId
        },
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "username", "email"],
          },
        ],
      });
    } else {
      // Regular users can only update their own devices
      throw new Error("Unauthorized: Only admins can update device firmware");
    }

    if (!device) {
      throw new Error("Device not found");
    }

    device.firmwareVersion = newFirmwareVersion;
    device.lastUpdated = new Date();
    await device.save();

    // Return device with user information
    return {
      id: device.id,
      deviceName: device.deviceName,
      deviceType: device.deviceType,
      serialNumber: device.serialNumber,
      firmwareVersion: device.firmwareVersion,
      lastUpdated: device.lastUpdated,
      createdAt: device.createdAt,
      user: device.user ? {
        id: device.user.id,
        username: device.user.username,
        email: device.user.email,
      } : null,
    };
  }

  async updateDevice(deviceId, userId, updateData) {
    const [updated] = await Device.update(
      {
        ...updateData,
        lastUpdated: new Date(),
      },
      {
        where: {
          id: deviceId,
          userId,
        },
      }
    );

    if (updated === 0) {
      throw new Error("Device not found or unauthorized");
    }

    return this.getDeviceById(deviceId);
  }

  async getDeviceById(deviceId) {
    return await Device.findByPk(deviceId);
  }
}

module.exports = new DeviceService();
