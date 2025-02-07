const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");
const ProjectFile = require("../model/project-files.model");

const Project = sequelize.define(
  "Project",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    description: {
      type: DataTypes.TEXT,
    },
    youtubeLink: {
      type: DataTypes.STRING,
      validate: {
        isUrl: true,
      },
    },
    projectType: {
      type: DataTypes.ENUM("free", "paid"),
      allowNull: false,
      defaultValue: "free",
    },
    maxAcquisitions: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    version: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false
    },
    lastUpdated: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  },
  {
    tableName: "projects",
    timestamps: true,
  }
);

Project.hasMany(ProjectFile, {
  foreignKey: "projectId",
  as: "files",  // Changed from "acquisitions" to "files"
  onDelete: "CASCADE"
});

ProjectFile.belongsTo(Project, {
  foreignKey: "projectId",
  as: "project"
});


module.exports = Project;
