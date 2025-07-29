const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

const TicketLog = sequelize.define(
  "TicketLog",
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
    action: {
      type: DataTypes.ENUM(
        "Created",
        "Status Changed",
        "Assigned",
        "Unassigned",
        "Priority Changed",
        "Comment Added",
        "Resolved",
        "Reopened",
        "Escalated",
        "Closed",
        "Updated"
      ),
      allowNull: false,
    },
    oldValue: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "old_value",
    },
    newValue: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "new_value",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "ip_address",
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "user_agent",
    },
    createdAt: {
      type: DataTypes.DATE,
      field: "created_at", // Add this mapping
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: "updated_at", // Add this mapping
    },
  },
  {
    tableName: "ticket_logs",
    timestamps: true,
    underscored: true,
  }
);

module.exports = TicketLog;
