const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

const Query = sequelize.define(
  "Query",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    ticketId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "ticket_id",
      references: {
        model: "tickets",
        key: "id",
      },
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "user_id",
      references: {
        model: "user",
        key: "id",
      },
    },
    queryType: {
      type: DataTypes.ENUM(
        "Question",
        "Update",
        "Response",
        "Internal Note",
        "Status Change"
      ),
      allowNull: false,
      field: "query_type",
      defaultValue: "Question",
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [5, 200],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    contactNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "contact_number",
      validate: {
        len: [10, 15],
      },
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "is_public",
    },
    parentQueryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "parent_query_id",
      references: {
        model: "queries",
        key: "id",
      },
    },
    attachments: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    isResolved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "is_resolved",
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "resolved_at",
    },
    resolvedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "resolved_by",
      references: {
        model: "user",
        key: "id",
      },
    },
    priority: {
      type: DataTypes.ENUM("Low", "Medium", "High", "Critical"),
      allowNull: false,
      defaultValue: "Medium",
    },
    createdAt: {
      type: DataTypes.DATE,
      field: "created_at", // Add this mapping
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: "updated_at", // Add this mapping
    },
    // Soft delete support
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "deleted_at",
    },
  },
  {
    tableName: "queries",
    timestamps: true,
    paranoid: true,
   
  }
);

module.exports = Query;
