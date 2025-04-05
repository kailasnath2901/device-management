const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const User = require('./user.model');

const Device = sequelize.define('Device', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true, // Changed to true to allow null values initially
    references: {
      model: 'users',
      key: 'id'
    }
  },
  deviceName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  deviceType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  serialNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  firmwareVersion: {
    type: DataTypes.STRING,
    defaultValue: '1.0.0'
  },
  lastUpdated: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'devices',
  timestamps: true ,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'deviceId'] // Prevent duplicate claims
    }
  ]
});

module.exports = Device;