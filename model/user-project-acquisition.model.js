const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const User = require('./user.model');
const Project = require('./project.model');

const UserProjectAcquisition = sequelize.define('UserProjectAcquisition', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'user',
      key: 'id'
    }
  },
  firmwareVersion: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '1.0.0' // Default firmware version
  },
  hasRemovalOccurred: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'projects',
      key: 'id'
    }
  }
}, {
  tableName: 'user_project_acquisitions',
  timestamps: true
});

UserProjectAcquisition.belongsTo(User, { 
  foreignKey: 'userId', 
  as: 'user'  // Changed from "project" to "user"
});

UserProjectAcquisition.belongsTo(Project, { 
  foreignKey: 'projectId', 
  as: 'project',
  onDelete: 'CASCADE' // Add this
});

module.exports = UserProjectAcquisition;