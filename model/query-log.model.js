const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

const QueryLog = sequelize.define(
  "QueryLog",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    queryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "query_id",
      references: {
        model: "queries",
        key: "id",
      },
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
        "Updated",
        "Resolved",
        "Reopened",
        "Deleted",
        "Response Added",
        "Priority Changed"
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
    tableName: "query_logs",
    timestamps: true,
    underscored: true,
    paranoid:false
  }
);

module.exports = QueryLog;
