// model/project-files.model.js
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
    field: 'project_id', // Maps to database column project_id
    references: {
      model: 'projects',
      key: 'id'
    }
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'filename' // Database column is already correct
  },
  fileType: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'file_type' // Maps to database column file_type
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'file_size' // Maps to database column file_size
  },
  filePath: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'file_path' // Maps to database column file_path
  },
  mimetype: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'mimetype' // Database column is already correct
  },
  isZipExtracted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_zip_extracted' // Maps to database column is_zip_extracted
  },
  originalZipName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'original_zip_name' // Maps to database column original_zip_name
  }
}, {
  tableName: 'project_files',
  timestamps: true,
  underscored: true, // This tells Sequelize to expect snake_case in DB
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = ProjectFile;