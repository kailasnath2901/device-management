
// routes/query.routes.js
const express = require("express");
const router = express.Router();
const {
  createQuery,
  getQueries,
  getQueryById,
  updateQuery,
  deleteQuery,
  resolveQuery,
  getQueryHistory,
} = require("../controllers/query.controller");

// Create a new query
router.post("/", createQuery);

// Get all queries with filters and pagination
router.get("/", getQueries);

// Get specific query by ID
router.get("/:id", getQueryById);

// Update query
router.put("/:id", updateQuery);

// Delete query
router.delete("/:id", deleteQuery);

// Resolve query
router.patch("/:id/resolve", resolveQuery);

// Get query history/logs
router.get("/:id/history", getQueryHistory);

module.exports = router;