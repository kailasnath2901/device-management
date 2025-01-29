// models/file-download-log.model.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const FileDownloadLog = sequelize.define('FileDownloadLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  fileId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  downloadedAt: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  tableName: 'file_download_logs',
  timestamps: false
});

module.exports = FileDownloadLog;