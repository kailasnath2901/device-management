const User = require('./user.model');
const Device = require('./user-device.model');

// Define associations
User.hasMany(Device, {
  foreignKey: 'userId',
  as: 'devices'
});

Device.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// Export models with associations
module.exports = {
  User,
  Device
};