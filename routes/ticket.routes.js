// routes/ticket.routes.js
const express = require("express");
const router = express.Router();
const path = require('path');
const fs = require('fs');
const {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
  assignTicket,
  resolveTicket,
  escalateTicket,
  getTicketStats,
  getTicketHistory,
  markTicketAsRead
} = require("../controllers/ticket.controller");

// Import authentication middleware
const { authenticate, authorizeRoles } = require("../middleware/auth");

// Import upload middleware
const { upload, handleMulterError } = require("../middleware/upload");

// ============== PUBLIC/USER ROUTES ==============

/**
 * Create a new ticket (Any authenticated user)
 * POST /api/tickets
 */
router.post(
  "/",
  authenticate,
  upload.array('attachments', 10),
  handleMulterError,
  createTicket
);

/**
 * Get all tickets with filters
 * Users see only their tickets, Admins see all
 * GET /api/tickets
 */
router.get("/", authenticate, getTickets);

/**
 * Get ticket statistics
 * GET /api/tickets/stats
 */
router.get("/stats", authenticate, getTicketStats);

/**
 * Get specific ticket by ID or ticketId
 * Users can only view their own tickets, Admins can view all
 * GET /api/tickets/:id
 */
router.get("/:id", authenticate, getTicketById);

/**
 * Get ticket history/logs
 * GET /api/tickets/:id/history
 */
router.get("/:id/history", authenticate, getTicketHistory);

/**
 * Mark ticket as read
 * PATCH /api/tickets/:id/read
 */
router.patch("/:id/read", authenticate, markTicketAsRead);

// ============== FILE SERVING ROUTES ==============

/**
 * Serve uploaded files/images
 * GET /api/tickets/attachments/:filename
 */
router.get("/attachments/:filename", authenticate, (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, '../uploads/ticketImages', filename);

  if (fs.existsSync(filepath)) {
    const ext = path.extname(filename).toLowerCase();
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];

    if (imageExtensions.includes(ext)) {
      const contentType = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.bmp': 'image/bmp',
        '.svg': 'image/svg+xml'
      };
      res.setHeader('Content-Type', contentType[ext] || 'image/jpeg');
    }

    res.sendFile(path.resolve(filepath));
  } else {
    res.status(404).json({
      success: false,
      message: "File not found"
    });
  }
});

/**
 * Download attachment
 * GET /api/tickets/download/:filename
 */
router.get("/download/:filename", authenticate, (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, '../uploads/ticketImages', filename);

  if (fs.existsSync(filepath)) {
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error("Error downloading file:", err);
        res.status(500).json({
          success: false,
          message: "Error downloading file"
        });
      }
    });
  } else {
    res.status(404).json({
      success: false,
      message: "File not found"
    });
  }
});

/**
 * Get ticket attachments metadata
 * GET /api/tickets/:id/attachments
 */
router.get("/:id/attachments", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const Ticket = require("../model/ticket.model");

    const ticket = await Ticket.findByPk(id, {
      attributes: ['id', 'attachments']
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found"
      });
    }

    res.json({
      success: true,
      data: {
        ticketId: ticket.id,
        attachments: ticket.attachments || []
      }
    });
  } catch (error) {
    console.error("Error fetching ticket attachments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch ticket attachments",
      error: error.message
    });
  }
});

// ============== ADMIN/SUPER_ADMIN ONLY ROUTES ==============

/**
 * Update ticket (Admin only)
 * PUT /api/tickets/:id
 */
router.put(
  "/:id",
  authenticate,
  authorizeRoles('admin', 'super_admin'),
  updateTicket
);

/**
 * Assign ticket to user (Admin only)
 * PATCH /api/tickets/:id/assign
 */
router.patch(
  "/:id/assign",
  authenticate,
  authorizeRoles('admin', 'super_admin'),
  assignTicket
);

/**
 * Resolve ticket (Admin only)
 * PATCH /api/tickets/:id/resolve
 */
router.patch(
  "/:id/resolve",
  authenticate,
  authorizeRoles('admin', 'super_admin'),
  resolveTicket
);

/**
 * Escalate ticket (Admin only)
 * PATCH /api/tickets/:id/escalate
 */
router.patch(
  "/:id/escalate",
  authenticate,
  authorizeRoles('admin', 'super_admin'),
  escalateTicket
);

/**
 * Delete ticket (Admin only)
 * DELETE /api/tickets/:id
 */
router.delete(
  "/:id",
  authenticate,
  authorizeRoles('admin', 'super_admin'),
  deleteTicket
);

module.exports = router;