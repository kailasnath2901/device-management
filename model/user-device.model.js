// models/device.model.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");
const User = require("./user.model");

const Device = sequelize.define(
  "Devices",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    deviceName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    deviceType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    serialNumber: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    firmwareVersion: {
      type: DataTypes.STRING,
      defaultValue: "1.0.0",
    },
    nickName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    updateAvailable: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isModified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    lastUpdated: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: User,
        key: "id",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
    // New avatar field
    deviceAvatar: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Stored as uploads/devices/:deviceId/filename"
    },
    // Extra data fields for device metadata
    extradata1: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
      get() {
        const value = this.getDataValue("extradata1");
        if (!value) return null;

        if (typeof value === "object") {
          return value;
        }

        try {
          return JSON.parse(value);
        } catch (e) {
          console.error("Error parsing extradata1 JSON:", e);
          return null;
        }
      },
      set(value) {
        if (value === null) {
          this.setDataValue("extradata1", null);
        } else if (typeof value === "string") {
          this.setDataValue("extradata1", value);
        } else {
          this.setDataValue("extradata1", JSON.stringify(value));
        }
      },
    },
    extradata2: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
      get() {
        const value = this.getDataValue("extradata2");
        if (!value) return null;

        if (typeof value === "object") {
          return value;
        }

        try {
          return JSON.parse(value);
        } catch (e) {
          console.error("Error parsing extradata2 JSON:", e);
          return null;
        }
      },
      set(value) {
        if (value === null) {
          this.setDataValue("extradata2", null);
        } else if (typeof value === "string") {
          this.setDataValue("extradata2", value);
        } else {
          this.setDataValue("extradata2", JSON.stringify(value));
        }
      },
    },
    extradata3: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
      get() {
        const value = this.getDataValue("extradata3");
        if (!value) return null;

        if (typeof value === "object") {
          return value;
        }

        try {
          return JSON.parse(value);
        } catch (e) {
          console.error("Error parsing extradata3 JSON:", e);
          return null;
        }
      },
      set(value) {
        if (value === null) {
          this.setDataValue("extradata3", null);
        } else if (typeof value === "string") {
          this.setDataValue("extradata3", value);
        } else {
          this.setDataValue("extradata3", JSON.stringify(value));
        }
      },
    },
  },
  {
    tableName: "device",
    timestamps: true,
  }
);

module.exports = Device;