// config/sequelize.js
const { Sequelize } = require('sequelize');
const env = require('dotenv');

env.config();

const sequelize = new Sequelize(
  process.env.database, 
  process.env.SqlUsername, 
  process.env.SqlPassword, 
  {
    host: process.env.Host_Name,
    dialect: 'mysql',
    logging: false,
    define: {
        timestamps: true,
        underscored: true
      }
  }
);

module.exports = sequelize;

