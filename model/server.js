const express = require("express");
const app = express();
const morgan = require("morgan");
const env = require("dotenv");
const sequelize = require("./config/sequelize");
const cors = require("cors");
env.config();
const path = require('path');
const fs = require('fs');

app.use(express.json());
app.use(morgan("dev"));

// Add this right after your other middleware (app.use statements)
app.use(
  cors({
    origin: ["http://64.227.138.175:8010", "http://192.168.10.124:8010", "http://localhost:3000","https://api.roboninjaz.com","https://roboninjaz.com"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  })
);

app.use(express.static(path.join(__dirname, 'public')));
app.use('/firmware', express.static(path.join(__dirname, 'uploads/firmware')));

app.use("/api/user", require("./routes/user.routes"));
app.use("/api/projects", require("./routes/project.routes"));
app.use("/api/user-devices", require("./routes/user-device.routes"));
// app.use('/api/admin', require('./routes/admin.routes'));
app.use("/api/firmware", require("./routes/fileFirmware.routes"));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});



app.get("/test", (req, res) => {
  res.status(200).send("<h1> Node js project created with Sequelize </h1>");
});

const port = process.env.PORT || 8010;

const startServer = async () => {
  try {
    // Test database connection and sync models
    await sequelize.authenticate();
    await sequelize.sync({ alter: false }); 
    console.log("Connected to database");

    app.listen(port,'0.0.0.0', () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.log("Error connecting to database:", error);
  }
};

startServer();
