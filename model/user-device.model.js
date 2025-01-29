const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Device = sequelize.define('Device', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
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
    unique: true
  },
  firmwareVersion: {
    type: DataTypes.STRING,
    defaultValue: '1.0.0'
  },
  lastUpdated: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'user_devices',
  timestamps: true
});

Device.associate = (models) => {
  Device.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
};


module.exports = Device;