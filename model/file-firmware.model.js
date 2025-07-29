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
      field: 'file_name' // Map to snake_case
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: true, // Changed to allow null since zip files might be deleted
      field: 'file_path' // Map to snake_case
    },
    extractPath: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'extract_path' // Map to snake_case
    },
    isZipExtracted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_zip_extracted' // Map to snake_case
    },
    isLatest: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_latest' // Map to snake_case
    },
    uploadedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'uploaded_at' // Map to snake_case
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'file_size' // Map to snake_case
    },
    deviceType: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'device_type' // Map to snake_case
    },
    // New field for firmware update availability
    firmwareUpdateAvailable: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'firmware_update_available'
    },
    // Track file type for better organization
    fileType: {
      type: DataTypes.ENUM('zip', 'bin', 'hex', 'other'),
      allowNull: false,
      defaultValue: 'other',
      field: 'fileType' // Map to snake_case
    },
    // Track if original zip file was deleted after extraction
    originalZipDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'original_zip_deleted'
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "deleted_at",
    },
  },
  {
     tableName: "firmware",
    timestamps: true,
    paranoid: true,
    underscored: false, // Important: set to false since we're not using snake_case
    createdAt: 'created_at',
    updatedAt: 'updated_at',

  }
);

module.exports = Firmware;