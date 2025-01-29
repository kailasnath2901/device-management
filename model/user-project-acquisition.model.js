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
      model: User,
      key: 'id'
    }
  },
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Project,
      key: 'id'
    }
  }
}, {
  tableName: 'user_project_acquisitions',
  timestamps: true
});

// Associations
UserProjectAcquisition.belongsTo(User, { foreignKey: 'userId' });
UserProjectAcquisition.belongsTo(Project, { foreignKey: 'projectId' });

module.exports = UserProjectAcquisition;