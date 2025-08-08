const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

const Device = sequelize.define(
  "Device",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "user", // Should match your User table name
        key: "id",
      },
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
      allowNull: false,
      unique: true,
    },
    firmwareVersion: {
      type: DataTypes.STRING,
      defaultValue: "1.0.0",
    },
    isModified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    nickName: {
      type: DataTypes.STRING,
      defaultValue: "Ninja",
    },
     updateAvailable: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    lastUpdated: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "devices",
    timestamps: true,
    underscored: true,
  }
);

module.exports = Device;
