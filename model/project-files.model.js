const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const ProjectFile = sequelize.define('ProjectFile', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'projects',
        key: 'id'
      }
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fileType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: false
    },
    mimetype: {
        type: DataTypes.STRING,
        allowNull: false
      }
  }, {
    tableName: 'project_files',
    timestamps: true
  });
  
  module.exports = ProjectFile;