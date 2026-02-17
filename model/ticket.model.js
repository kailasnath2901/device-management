const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");
const User = require("./user.model");

const Ticket = sequelize.define(
  "Ticket",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    ticketId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: "ticket_id",
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
    deviceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "device_id",
      references: {
        model: "device",
        key: "id",
      },
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "project_id",
      references: {
        model: "projects",
        key: "id",
      },
    },
    ticketType: {
      type: DataTypes.ENUM("Device Issue", "Project Issue", "General Query", "Payment Issue", "Feature Request", "Bug Report", "Other"),
      allowNull: false,
      field: "ticket_type",
      defaultValue: "General Query",
    },
    ticketStatus: {
      type: DataTypes.ENUM("Open", "In Progress", "Resolved", "Closed", "Pending"),
      allowNull: false,
      field: "ticket_status",
      defaultValue: "Open",
    },
    priority: {
      type: DataTypes.ENUM("Low", "Medium", "High", "Critical"),
      allowNull: false,
      defaultValue: "Medium",
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
    assignedTo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "assigned_to",
      references: {
        model: "user",
        key: "id",
      },
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
    estimatedResolutionTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "estimated_resolution_time",
    },
    actualResolutionTime: {
      type: DataTypes.INTEGER, // in minutes
      allowNull: true,
      field: "actual_resolution_time",
    },
    customerSatisfactionRating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "customer_satisfaction_rating",
      validate: {
        min: 1,
        max: 5,
      },
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    attachments: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    isEscalated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "is_escalated",
    },
    escalatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "escalated_at",
    },
    escalatedTo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "escalated_to",
      references: {
        model: "user",
        key: "id",
      },
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "is_read",
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "read_at",
    },
    readBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "read_by",
      references: {
        model: "user",
        key: "id",
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: "updated_at",
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "deleted_at",
    },
  },
  {
    tableName: "tickets",
    timestamps: true,
    paranoid: true,
  }
);

module.exports = Ticket;