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
} = require("../controllers/ticket.controller");

// Import upload middleware
const { upload, handleMulterError } = require("../middleware/upload");

// Create a new ticket with file uploads
router.post("/", upload.array('attachments', 10), handleMulterError, createTicket);

// Get all tickets with filters and pagination
router.get("/", getTickets);

// Get ticket statistics
router.get("/stats", getTicketStats);

// Route to serve uploaded files/images
router.get("/attachments/:filename", (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, '../uploads/ticketImages', filename);
  
  // Check if file exists
  if (fs.existsSync(filepath)) {
    // Set appropriate headers for images
    const ext = path.extname(filename).toLowerCase();
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    
    if (imageExtensions.includes(ext)) {
      // Set content type for images
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

// Route to download attachment (with original filename)
router.get("/download/:filename", (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, '../uploads/ticketImages', filename);
  
  // Check if file exists
  if (fs.existsSync(filepath)) {
    // You can store original filename in database and use it here
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

// Get specific ticket by ID
router.get("/:id", getTicketById);

// Update ticket
router.put("/:id", updateTicket);

// Delete ticket
router.delete("/:id", deleteTicket);

// Assign ticket to user
router.patch("/:id/assign", assignTicket);

// Resolve ticket
router.patch("/:id/resolve", resolveTicket);

// Escalate ticket
router.patch("/:id/escalate", escalateTicket);

// Get ticket history/logs
router.get("/:id/history", getTicketHistory);

// Route to get ticket attachments metadata
router.get("/:id/attachments", async (req, res) => {
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

module.exports = router;