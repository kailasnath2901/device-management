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
  markQueryAsRead
} = require("../controllers/query.controller");

// Import authentication middleware
const { authenticate, authorizeRoles } = require("../middleware/auth");

// ============== USER & ADMIN ROUTES ==============

/**
 * Create a new query/comment on a ticket (Any authenticated user)
 * Users can add queries to their own tickets
 * Admins can add queries to any ticket
 * POST /api/queries
 */
router.post("/", authenticate, createQuery);

/**
 * Get all queries with filters
 * Users see only queries from their tickets, Admins see all
 * GET /api/queries
 */
router.get("/", authenticate, getQueries);

/**
 * Get specific query by ID
 * Users can only view queries from their own tickets
 * GET /api/queries/:id
 */
router.get("/:id", authenticate, getQueryById);

/**
 * Get query history/logs
 * GET /api/queries/:id/history
 */
router.get("/:id/history", authenticate, getQueryHistory);

/**
 * Mark query as read
 * PATCH /api/queries/:id/read
 */
router.patch("/:id/read", authenticate, markQueryAsRead);

// ============== ADMIN ONLY ROUTES ==============

/**
 * Update query (Admin only)
 * PUT /api/queries/:id
 */
router.put(
  "/:id",
  authenticate,
  authorizeRoles('admin', 'super_admin'),
  updateQuery
);

/**
 * Resolve query (Admin only)
 * PATCH /api/queries/:id/resolve
 */
router.patch(
  "/:id/resolve",
  authenticate,
  authorizeRoles('admin', 'super_admin'),
  resolveQuery
);

/**
 * Delete query (Admin only)
 * DELETE /api/queries/:id
 */
router.delete(
  "/:id",
  authenticate,
  authorizeRoles('admin', 'super_admin'),
  deleteQuery
);

module.exports = router;