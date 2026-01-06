const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");
const User = require("./user.model");
const Project = require("./project.model");
const Device = require("./user-device.model");

const UserProjectAcquisition = sequelize.define(
  "UserProjectAcquisition",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      field: "user_id",
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    deviceId: {
      type: DataTypes.INTEGER,
      field: "device_id",
      allowNull: false,
      references: {
        model: "devices",
        key: "id",
      },
    },
    firmwareVersion: {
      type: DataTypes.STRING,
      field: "firmware_version",
      allowNull: true,
      defaultValue: "1.0.0",
    },
    hasRemovalOccurred: {
      type: DataTypes.BOOLEAN,
      field: "has_removal_occurred",
      allowNull: false,
      defaultValue: false,
    },
    projectId: {
      type: DataTypes.INTEGER,
      field: "project_id",
      allowNull: false,
      references: {
        model: "projects",
        key: "id",
      },
    },
    // NEW FIELD - Track which project is running
    isRunning: {
      type: DataTypes.BOOLEAN,
      field: "is_running",
      allowNull: false,
      defaultValue: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: "updated_at",
    },
  },
  {
    tableName: "user_project_acquisitions",
    timestamps: true,
    underscored: false,
  }
);

UserProjectAcquisition.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

UserProjectAcquisition.belongsTo(Project, {
  foreignKey: "projectId",
  as: "project",
  onDelete: "CASCADE",
});

UserProjectAcquisition.belongsTo(Device, {
  foreignKey: "deviceId",
  as: "device",
});

Device.hasMany(UserProjectAcquisition, {
  foreignKey: "deviceId",
  as: "acquisitions",
});

module.exports = UserProjectAcquisition;