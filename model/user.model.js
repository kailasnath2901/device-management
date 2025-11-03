// models/user.model.js
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
      type: DataTypes.ENUM("user", "admin", "super_admin", "tester"),
      defaultValue: "user",
    },
    last_login: {
      type: DataTypes.DATE,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
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
    profileAvatar: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Stored as uploads/users/:userId/filename"
    },
    extradata1: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
      get() {
        const value = this.getDataValue("extradata1");
        if (!value) return null;

        if (typeof value === "object") {
          return value;
        }

        try {
          return JSON.parse(value);
        } catch (e) {
          console.error("Error parsing extradata1 JSON:", e);
          return null;
        }
      },
      set(value) {
        if (value === null) {
          this.setDataValue("extradata1", null);
        } else if (typeof value === "string") {
          this.setDataValue("extradata1", value);
        } else {
          this.setDataValue("extradata1", JSON.stringify(value));
        }
      },
    },
    extradata2: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
      get() {
        const value = this.getDataValue("extradata2");
        if (!value) return null;

        if (typeof value === "object") {
          return value;
        }

        try {
          return JSON.parse(value);
        } catch (e) {
          console.error("Error parsing extradata2 JSON:", e);
          return null;
        }
      },
      set(value) {
        if (value === null) {
          this.setDataValue("extradata2", null);
        } else if (typeof value === "string") {
          this.setDataValue("extradata2", value);
        } else {
          this.setDataValue("extradata2", JSON.stringify(value));
        }
      },
    },
    extradata3: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
      get() {
        const value = this.getDataValue("extradata3");
        if (!value) return null;

        if (typeof value === "object") {
          return value;
        }

        try {
          return JSON.parse(value);
        } catch (e) {
          console.error("Error parsing extradata3 JSON:", e);
          return null;
        }
      },
      set(value) {
        if (value === null) {
          this.setDataValue("extradata3", null);
        } else if (typeof value === "string") {
          this.setDataValue("extradata3", value);
        } else {
          this.setDataValue("extradata3", JSON.stringify(value));
        }
      },
    },
  },
  {
    tableName: "user",
    timestamps: true,
    paranoid: false,

    defaultScope: {
      where: {
        is_active: true,
      },
    },

    scopes: {
      withDeleted: {
        where: {},
      },
      deletedOnly: {
        where: {
          is_active: false,
        },
      },
    },
  }
);

module.exports = User;