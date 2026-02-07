// app.js - Updated with ticket system
const express = require("express");
const app = express();
const morgan = require("morgan");
const env = require("dotenv");
const sequelize = require("./config/sequelize");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { performInitialSetup } = require("./services/initial-setup.service");
const ProjectService = require("./services/project.services");
require("./model/associations.model");
env.config();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// CORS configuration
app.use(
  cors({
    origin: [
      "http://64.227.138.175:8025",
      "http://192.168.10.124:8025",
      "http://192.168.10.124:8050",
      "http://localhost:3000",
      "http://localhost:8010",
      "https://devui.roboninjaz.com",
      "https://api.roboninjaz.com",
      "https://roboninjaz.com",
      "https://dev.roboninjaz.com",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
// app.use("/firmware", express.static(path.join(__dirname, "uploads/firmware")));
// app.use(
//   "/firmware-extracted",
//   express.static(path.join(__dirname, "firmware_extracted"))
// );

// Static file serving
// app.use(express.static(path.join(__dirname, "public")));

app.use("/uploads/projects", express.static(path.join(__dirname, "public/projects")));
app.use("/uploads/users", express.static(path.join(__dirname, "uploads/users")));  // ✅ ADD THIS
app.use("/uploads/devices", express.static(path.join(__dirname, "uploads/devices")));  // ✅ AND THIS

// Routes
app.use("/api/user", require("./routes/user.routes"));
app.use("/api/projects", require("./routes/project.routes"));
app.use("/api/user-devices", require("./routes/user-device.routes"));
app.use("/api/firmware", require("./routes/fileFirmware.routes"));
app.use("/api/tickets", require("./routes/ticket.routes"));
app.use("/api/queries", require("./routes/query.routes"));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Test route
app.get("/test", (req, res) => {
  res
    .status(200)
    .send(
      "<h1>Node.js project created with Sequelize - Ticket System Ready</h1>"
    );
});

const port = process.env.PORT || 8015;
const port2 = process.env.PORT_ALTERNATIVE || 8050;

const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log("Database connection established successfully.");

    console.log("Model associations defined successfully.");
    require('dotenv').config();

    // console.log('Reset Template:', process.env.ZEPTOMAIL_RESET_TEMPLATE_KEY);
    // Sync models with database
    await sequelize.sync({
      alter: false, // Set to true only for development if you want to auto-alter tables
    });
    console.log("Database synchronized successfully.");

    // Perform initial setup if needed
    // await performInitialSetup({ username: 'Admin', email: 'admin@roboninjaz.com', password: 'admin123' });

    // Start server
    app.listen(port, "0.0.0.0", () => {
      console.log(`Server is running on port ${port}`);
      console.log(`Ticket system is ready!`);
    });

    app.listen(8050, "0.0.0.0", () => {
      console.log(`Server is running on port ${8050}`);
      console.log(`Ticket system is ready!`);
    });

    try {
      const result = await ProjectService.initializeRunningProjects();
      console.log("Initialization result:", result);
    } catch (error) {
      console.error("Failed to initialize running projects:", error);
    }
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
};

startServer();

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");
  await sequelize.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully...");
  await sequelize.close();
  process.exit(0);
});
