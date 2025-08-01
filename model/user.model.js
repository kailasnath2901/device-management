const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("user", "admin", "super_admin","tester"),
      defaultValue: "user",
    },
    last_login: {
      type: DataTypes.DATE,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    // New columns
    is_email_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    coupon_points: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    mobile_no: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: {
          args: [10, 10],

          msg: "Mobile number must be exactly 10 digits",
        },
        isNumeric: {
          msg: "Mobile number must contain only numbers",
        },
        notEmpty: function (value) {
          if (value !== null && value !== undefined && value.trim() === "") {
            throw new Error("Mobile number cannot be empty string");
          }
        },
      },
    },
    user_category: {
      type: DataTypes.ENUM("Standard", "Premium", "Elite"),
      defaultValue: "Standard",
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    deleted_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "User",
        key: "id",
      },
    },
  },
  {
    tableName: "user",
    timestamps: true,
    paranoid: false, // We're handling soft delete manually with is_active

    // Add default scope to exclude deleted users
    defaultScope: {
      where: {
        is_active: true,
      },
    },

    // Add scopes for different scenarios
    scopes: {
      // Include deleted users
      withDeleted: {
        where: {},
      },
      // Only deleted users
      deletedOnly: {
        where: {
          is_active: false,
        },
      },
    },
  }
);

module.exports = User;
