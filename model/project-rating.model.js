// models/projectRating.model.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");
const User = require("./user.model");
const Project = require("./project.model");

const ProjectRating = sequelize.define(
  "ProjectRating",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "project_id",
      references: {
        model: "projects",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "user_id",
      references: {
        model: "user",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5,
      },
      comment: "Rating from 1 to 5 stars",
    },
    review: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 1000],
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      field: "created_at",
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: "updated_at",
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "project_ratings",
    timestamps: true,
    underscored: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        fields: ["project_id", "user_id"],
        name: "unique_project_user_rating",
      },
    ],
  }
);

// Associations
ProjectRating.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

ProjectRating.belongsTo(Project, {
  foreignKey: "projectId",
  as: "project",
});

Project.hasMany(ProjectRating, {
  foreignKey: "projectId",
  as: "ratings",
  onDelete: "CASCADE",
});

User.hasMany(ProjectRating, {
  foreignKey: "userId",
  as: "ratings",
  onDelete: "CASCADE",
});

module.exports = ProjectRating;