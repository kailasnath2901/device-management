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
app.use(express.static(path.join(__dirname, 'public')));
app.use('/firmware', express.static(path.join(__dirname, 'uploads/firmware')));

app.use("/api/user", require("./routes/user.routes"));
app.use("/api/projects", require("./routes/project.routes"));
app.use("/api/user-devices", require("./routes/user-device.routes"));
// app.use('/api/admin', require('./routes/admin.routes'));
app.use("/api/firmware", require("./routes/fileFirmware.routes"));


app.get("/test", (req, res) => {
  res.status(200).send("<h1> Node js project created with Sequelize </h1>");
});

const port = process.env.PORT || 8010;

const startServer = async () => {
  try {
    // Test database connection and sync models
    await sequelize.authenticate();
    await sequelize.sync({ alter: false }); // Change to false

    console.log("Connected to database");

    app.listen(port, "0.0.0.0", () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.log("Error connecting to database:", error);
  }
};

startServer();
