const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");
const ProjectFile = require("./project-files.model");
const ProjectImage = require("./projectImage.model");
const Category = require("./category.model");
const Component = require("./component.model");
const ProjectComponent = require("./projectComponent.model");

const Project = sequelize.define(
  "Project",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    projectId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: "project_id",
      validate: {
        notEmpty: true,
      },
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
    // New fields as per requirements
    whatItIs: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "what_it_is",
      validate: {
        notEmpty: true,
      },
    },
    howItWorks: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "how_it_works",
      validate: {
        notEmpty: true,
      },
    },
    priceInInr: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "price_in_inr",
      validate: {
        min: 0,
      },
    },
    keywordsList: {
      type: DataTypes.JSON, // Store as JSON array
      allowNull: false,
      field: "keywords_list",
      validate: {
        notEmpty: true,
      },
    },
    difficulty: {
      type: DataTypes.ENUM("easy", "medium", "hard"),
      allowNull: false,
      defaultValue: "easy",
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "category_id",
      references: {
        model: "categories",
        key: "id",
      },
    },
    testAndTroubleshootLink: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "test_and_troubleshoot_link",
      validate: {
        isUrl: true,
      },
    },
    versionType: {
      type: DataTypes.ENUM("development", "release"),
      allowNull: false,
      field: "version_type",
    },
    // Existing fields
    youtubeLink: {
      type: DataTypes.STRING,
      field: "youtube_link",
      validate: {
        isUrl: true,
      },
    },
    projectType: {
      type: DataTypes.ENUM("free", "paid"),
      allowNull: false,
      field: "project_type",
      defaultValue: "free",
    },
    maxAcquisitions: {
      type: DataTypes.INTEGER,
      field: "max_acquisitions",
      defaultValue: 5,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "user_id",
    },
    version: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
    },
    lastUpdated: {
      type: DataTypes.DATE,
      field: "last_updated",
      defaultValue: DataTypes.NOW,
    },
    // Add soft delete column
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "deleted_at",
    },
    createdAt: {
      type: DataTypes.DATE,
      field: "created_at", // Add this mapping
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: "updated_at", // Add this mapping
    },
    dashboard: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
      get() {
        const value = this.getDataValue("dashboard");
        if (!value) return null;

        // If it's already an object, return it
        if (typeof value === "object") {
          return value;
        }

        // If it's a string, try to parse it
        try {
          return JSON.parse(value);
        } catch (e) {
          console.error("Error parsing dashboard JSON:", e);
          return null;
        }
      },
      set(value) {
        if (value === null || value === undefined) {
          this.setDataValue("dashboard", null);
          return;
        }

        // If it's already a string, store it directly
        if (typeof value === "string") {
          this.setDataValue("dashboard", value);
          return;
        }

        // If it's an object/array, stringify it
        try {
          this.setDataValue("dashboard", JSON.stringify(value));
        } catch (e) {
          console.error("Error stringifying dashboard:", e);
          this.setDataValue("dashboard", null);
        }
      },
    },
  },

  {
    tableName: "projects",
    timestamps: true,
    paranoid: true,
    underscored: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
  }
);

// Define associations
Project.hasMany(ProjectFile, {
  foreignKey: "projectId",
  as: "files",
  onDelete: "CASCADE",
});

Project.hasMany(ProjectImage, {
  foreignKey: "projectId",
  as: "images",
  onDelete: "CASCADE",
});

Project.belongsTo(Category, {
  foreignKey: "categoryId",
  as: "category",
});

// Many-to-many relationship between Project and Component
Project.belongsToMany(Component, {
  through: ProjectComponent,
  foreignKey: "projectId",
  otherKey: "componentId",
  as: "components",
});

Component.belongsToMany(Project, {
  through: ProjectComponent,
  foreignKey: "componentId",
  otherKey: "projectId",
  as: "projects",
});

// Direct access to junction table
Project.hasMany(ProjectComponent, {
  foreignKey: "projectId",
  as: "projectComponents",
});

ProjectFile.belongsTo(Project, {
  foreignKey: "projectId",
  as: "project",
});

ProjectImage.belongsTo(Project, {
  foreignKey: "projectId",
  as: "project",
});

Category.hasMany(Project, {
  foreignKey: "categoryId",
  as: "projects",
});

ProjectComponent.belongsTo(Project, {
  foreignKey: "projectId",
  as: "project",
});

ProjectComponent.belongsTo(Component, {
  foreignKey: "componentId",
  as: "component",
});

module.exports = Project;
