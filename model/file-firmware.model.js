const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

const Firmware = sequelize.define(
  "Firmware",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    version: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    extractPath: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isZipExtracted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isLatest: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    uploadedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    deviceType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "firmware",
    timestamps: true,
  }
);

module.exports = Firmware;