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
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at' // Add this mapping
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at' // Add this mapping
    }
  },
  {
    tableName: "user_project_acquisitions",
    timestamps: true,
    underscored: false
  }
);

UserProjectAcquisition.belongsTo(User, {
  foreignKey: "userId",
  as: "user", // Changed from "project" to "user"
});

UserProjectAcquisition.belongsTo(Project, {
  foreignKey: "projectId",
  as: "project",
  onDelete: "CASCADE", // Add this
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
