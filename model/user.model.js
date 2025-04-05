const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");
const Device = require("../model/user-device.model")

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("user", "admin", "super_admin"),
      defaultValue: "user",
    },
    last_login: {
      type: DataTypes.DATE,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "user",
    timestamps: true,
  },
  
);

// Set up association in the Device model
// device.model.js
Device.belongsToMany(User, {
  through: 'devices',
  foreignKey: 'deviceId',
});

// user.model.js
User.belongsToMany(Device, {
  through: 'devices',
  foreignKey: 'userId',
});


module.exports = User;
