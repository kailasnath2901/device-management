const User = require('./user.model');
const Device = require('./user-device.model');

// Set up associations
Device.belongsTo(User, { foreignKey: 'userId', as: 'owner' });
User.hasMany(Device, { foreignKey: 'userId', as: 'devices' });

module.exports = {
  User,
  Device
};