// controllers/ticket.controller.js
const { Op } = require("sequelize");
const Ticket = require("../model/ticket.model");
const Query = require("../model/query.model");
const TicketLog = require("../model/ticket-log.model");
const User = require("../model/user.model");
const Device = require("../model/user-device.model");
const Project = require("../model/project.model");
const { logTicketAction } = require("../utils/utils.logging");
const path = require("path");
const fs = require("fs");

// Helper function to generate unique ticket ID
const generateTicketId = () => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substr(2, 5);
  return `TKT-${timestamp}-${randomStr}`.toUpperCase();
};

// Helper function to process uploaded files
const processUploadedFiles = (files) => {
  if (!files || files.length === 0) {
    return [];
  }

  return files.map((file) => ({
    originalName: file.originalname,
    filename: file.filename,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path,
    uploadDate: new Date().toISOString(),
    url: `/api/tickets/attachments/${file.filename}`, // URL to access the file
  }));
};

// Helper function to delete files
const deleteFiles = (attachments) => {
  if (!attachments || attachments.length === 0) return;

  attachments.forEach((attachment) => {
    const filepath = path.join(
      __dirname,
      "../uploads/ticketImages",
      attachment.filename
    );
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  });
};

const createTicket = async (req, res) => {
  try {
    const {
      userId,
      deviceId,
      projectId,
      ticketType,
      priority,
      title,
      description,
      contactNumber,
      remarks,
      tags,
    } = req.body;

    // 1. Basic Field Validation
    if (!userId || !ticketType || !title || !description) {
      if (req.files) deleteFiles(processUploadedFiles(req.files));
      return res.status(400).json({
        success: false,
        message: "Missing required fields: userId, ticketType, title, description",
      });
    }

    // 2. Validate User Existence
    const user = await User.findByPk(userId);
    if (!user) {
      if (req.files) deleteFiles(processUploadedFiles(req.files));
      return res.status(404).json({
        success: false,
        message: `Invalid User: User with ID ${userId} does not exist.`,
      });
    }

    // 3. Validate Device Ownership (If deviceId is provided)
    if (deviceId) {
      const device = await Device.findOne({
        where: { id: deviceId, userId: userId } // Ensure device belongs to this user
      });
      if (!device) {
        if (req.files) deleteFiles(processUploadedFiles(req.files));
        return res.status(403).json({
          success: false,
          message: "Access Denied: Device not found or does not belong to this user.",
        });
      }
    } else if (ticketType === "Device Issue") {
      if (req.files) deleteFiles(processUploadedFiles(req.files));
      return res.status(400).json({ success: false, message: "deviceId is required for Device Issues." });
    }

    // 4. Validate Project Association (If projectId is provided)
    if (projectId) {
      // Logic: Check if project exists. 
      // If you have a UserProject join table, you should verify the link here.
      const project = await Project.findByPk(projectId);
      if (!project) {
        if (req.files) deleteFiles(processUploadedFiles(req.files));
        return res.status(404).json({
          success: false,
          message: `Invalid Project: Project with ID ${projectId} does not exist.`,
        });
      }
      
      // Optional: If users must be assigned to projects to raise tickets:
      /*
      const isAssigned = await user.hasProject(project); 
      if (!isAssigned) {
         return res.status(403).json({ message: "User is not associated with this project." });
      }
      */
    } else if (ticketType === "Project Issue") {
      if (req.files) deleteFiles(processUploadedFiles(req.files));
      return res.status(400).json({ success: false, message: "projectId is required for Project Issues." });
    }

    // 5. Check Allowed Ticket Types
    const allowedTypes = ["Device Issue", "Project Issue", "General Query", "Payment Issue", "Feature Request", "Bug Report", "Other"];
    if (!allowedTypes.includes(ticketType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ticket type. Must be one of: ${allowedTypes.join(", ")}`,
      });
    }

    // Process Files & Tags
    const attachments = processUploadedFiles(req.files);
    let parsedTags = [];
    try {
      parsedTags = typeof tags === "string" ? JSON.parse(tags) : (Array.isArray(tags) ? tags : []);
    } catch (e) { parsedTags = []; }

    // 6. Create the Ticket
    const ticketId = generateTicketId();
    const ticket = await Ticket.create({
      ticketId,
      userId,
      deviceId: deviceId || null,
      projectId: projectId || null,
      ticketType,
      priority: priority || "Medium",
      title,
      description,
      contactNumber,
      remarks,
      tags: parsedTags,
      attachments: attachments,
    });

    // Log the creation
    await logTicketAction(ticket.id, userId, "Created", null, "Ticket created", req);

    res.status(201).json({
      success: true,
      message: "Ticket created successfully",
      data: ticket,
    });

  } catch (error) {
    console.error("Error creating ticket:", error);
    if (req.files) deleteFiles(processUploadedFiles(req.files));
    res.status(500).json({
      success: false,
      message: "Failed to create ticket",
      error: error.message,
    });
  }
};


// Get all tickets with filters and pagination
// In getTickets controller function
const getTickets = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      type,
      priority,
      userId,
      assignedTo,
      deviceId,
      projectId,
      search,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    // Apply filters
    if (status) where.ticketStatus = status;
    if (type) where.ticketType = type;
    if (priority) where.priority = priority;
    if (userId) {
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Invalid userId",
          error: "User does not exist",
        });
      }
      where.userId = parseInt(userId);
    }
    if (assignedTo) where.assignedTo = assignedTo;
    if (deviceId) where.deviceId = deviceId;
    if (projectId) where.projectId = projectId;

    // Search functionality
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { ticketId: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Ticket.findAndCountAll({
      where,
      include: [
        { 
          model: User, 
          as: "user", 
          attributes: ["id", "username", "email"],
          required: false  // ✅ Make it optional (though this one should be required since every ticket has a user)
        },
        {
          model: User,
          as: "assignedUser",
          attributes: ["id", "username", "email"],
          required: false  // ✅ Make it optional - tickets may not be assigned yet
        },
        {
          model: Device,
          as: "device",
          attributes: ["id", "deviceName", "deviceType"],
          required: false  // ✅ Make it optional - not all tickets have devices
        },
        {
          model: Project,
          as: "project",
          attributes: ["id", "name", "description"],
          required: false  // ✅ Make it optional - not all tickets have projects
        },
        {
          model: Query,
          as: "queries",
          attributes: ["id", "title", "queryType", "isResolved"],
          limit: 5,
          order: [["createdAt", "DESC"]],
          required: false  // ✅ Make it optional
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder.toUpperCase()]],
    });

    res.json({
      success: true,
      data: {
        tickets: rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tickets",
      error: error.message,
    });
  }
};

const getTicketById = async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await Ticket.findByPk(id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "username", "email", "mobile_no"],
          required: false  // ✅ Add this
        },
        {
          model: User,
          as: "assignedUser",
          attributes: ["id", "username", "email"],
          required: false  // ✅ Add this
        },
        {
          model: User,
          as: "resolver",
          attributes: ["id", "username", "email"],
          required: false  // ✅ Add this
        },
        {
          model: User,
          as: "escalatedUser",
          attributes: ["id", "username", "email"],
          required: false  // ✅ Add this
        },
        {
          model: Device,
          as: "device",
          attributes: ["id", "deviceName", "deviceType", "serialNumber"],
          required: false  // ✅ Add this
        },
        {
          model: Project,
          as: "project",
          attributes: ["id", "name", "description", "projectType"],
          required: false  // ✅ Add this
        },
        {
          model: Query,
          as: "queries",
          required: false,  // ✅ Add this
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "username", "email"],
              required: false  // ✅ Add this
            },
            {
              model: User,
              as: "resolver",
              attributes: ["id", "username", "email"],
              required: false  // ✅ Add this
            },
          ],
          order: [["createdAt", "ASC"]],
        },
        {
          model: TicketLog,
          as: "logs",
          required: false,  // ✅ Add this
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "username", "email"],
              required: false  // ✅ Add this
            },
          ],
          order: [["createdAt", "DESC"]],
          limit: 20,
        },
      ],
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    res.json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    console.error("Error fetching ticket:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch ticket",
      error: error.message,
    });
  }
};

// Update ticket
const updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, ...updateData } = req.body;

    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    // Track changes for logging
    const changes = {};
    Object.keys(updateData).forEach((key) => {
      if (ticket[key] !== updateData[key]) {
        changes[key] = { old: ticket[key], new: updateData[key] };
      }
    });

    await ticket.update(updateData);

    // Log the changes
    for (const [field, change] of Object.entries(changes)) {
      await logTicketAction(
        ticket.id,
        userId,
        "Updated",
        change.old,
        change.new,
        req,
        `Updated ${field} from ${change.old} to ${change.new}`
      );
    }

    const updatedTicket = await Ticket.findByPk(id, {
      include: [
        { model: User, as: "user", attributes: ["id", "username", "email"] },
        {
          model: User,
          as: "assignedUser",
          attributes: ["id", "username", "email"],
        },
        {
          model: Device,
          as: "device",
          attributes: ["id", "deviceName", "deviceType"],
        },
        {
          model: Project,
          as: "project",
          attributes: ["id", "name", "description"],
        },
      ],
    });

    res.json({
      success: true,
      message: "Ticket updated successfully",
      data: updatedTicket,
    });
  } catch (error) {
    console.error("Error updating ticket:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update ticket",
      error: error.message,
    });
  }
};

// Other methods remain the same...
const assignTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo, assignedBy } = req.body;

    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    const oldAssignedTo = ticket.assignedTo;
    await ticket.update({
      assignedTo,
      ticketStatus: "In Progress",
    });

    // Log the assignment
    await logTicketAction(
      ticket.id,
      assignedBy,
      "Assigned",
      oldAssignedTo,
      assignedTo,
      req,
      `Ticket assigned to user ${assignedTo}`
    );

    const updatedTicket = await Ticket.findByPk(id, {
      include: [
        { model: User, as: "user", attributes: ["id", "username", "email"] },
        {
          model: User,
          as: "assignedUser",
          attributes: ["id", "username", "email"],
        },
      ],
    });

    res.json({
      success: true,
      message: "Ticket assigned successfully",
      data: updatedTicket,
    });
  } catch (error) {
    console.error("Error assigning ticket:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign ticket",
      error: error.message,
    });
  }
};

const resolveTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolvedBy, resolutionNotes } = req.body;

    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    const resolvedAt = new Date();
    const actualResolutionTime = Math.floor(
      (resolvedAt - ticket.createdAt) / (1000 * 60)
    ); // in minutes

    await ticket.update({
      ticketStatus: "Resolved",
      resolvedBy,
      resolvedAt,
      actualResolutionTime,
      remarks: resolutionNotes || ticket.remarks,
    });

    // Log the resolution
    await logTicketAction(
      ticket.id,
      resolvedBy,
      "Resolved",
      "Open/In Progress",
      "Resolved",
      req,
      `Ticket resolved: ${resolutionNotes || "No notes provided"}`
    );

    const updatedTicket = await Ticket.findByPk(id, {
      include: [
        { model: User, as: "user", attributes: ["id", "username", "email"] },
        {
          model: User,
          as: "resolver",
          attributes: ["id", "username", "email"],
        },
      ],
    });

    res.json({
      success: true,
      message: "Ticket resolved successfully",
      data: updatedTicket,
    });
  } catch (error) {
    console.error("Error resolving ticket:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resolve ticket",
      error: error.message,
    });
  }
};

const escalateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { escalatedTo, escalatedBy, escalationReason } = req.body;

    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    await ticket.update({
      isEscalated: true,
      escalatedTo,
      escalatedAt: new Date(),
      priority: "High", // Escalated tickets get high priority
      assignedTo: escalatedTo,
    });

    // Log the escalation
    await logTicketAction(
      ticket.id,
      escalatedBy,
      "Escalated",
      ticket.escalatedTo,
      escalatedTo,
      req,
      `Ticket escalated: ${escalationReason || "No reason provided"}`
    );

    const updatedTicket = await Ticket.findByPk(id, {
      include: [
        { model: User, as: "user", attributes: ["id", "username", "email"] },
        {
          model: User,
          as: "escalatedUser",
          attributes: ["id", "username", "email"],
        },
      ],
    });

    res.json({
      success: true,
      message: "Ticket escalated successfully",
      data: updatedTicket,
    });
  } catch (error) {
    console.error("Error escalating ticket:", error);
    res.status(500).json({
      success: false,
      message: "Failed to escalate ticket",
      error: error.message,
    });
  }
};

const getTicketStats = async (req, res) => {
  try {
    const { userId, dateFrom, dateTo } = req.query;
    const where = {};

    if (userId) where.userId = userId;
    if (dateFrom && dateTo) {
      where.createdAt = {
        [Op.between]: [new Date(dateFrom), new Date(dateTo)],
      };
    }

    const stats = await Promise.all([
      Ticket.count({ where: { ...where, ticketStatus: "Open" } }),
      Ticket.count({ where: { ...where, ticketStatus: "In Progress" } }),
      Ticket.count({ where: { ...where, ticketStatus: "Resolved" } }),
      Ticket.count({ where: { ...where, ticketStatus: "Closed" } }),
      Ticket.count({ where: { ...where, priority: "Critical" } }),
      Ticket.count({ where: { ...where, priority: "High" } }),
      Ticket.count({ where: { ...where, isEscalated: true } }),
      Ticket.count({ where }),
    ]);

    // Get tickets by type
    const ticketsByType = await Ticket.findAll({
      where,
      attributes: [
        "ticketType",
        [require("sequelize").fn("COUNT", "*"), "count"],
      ],
      group: ["ticketType"],
      raw: true,
    });

    // Get average resolution time
    const avgResolutionTime = await Ticket.findOne({
      where: { ...where, ticketStatus: "Resolved" },
      attributes: [
        [
          require("sequelize").fn(
            "AVG",
            require("sequelize").col("actualResolutionTime")
          ),
          "avgTime",
        ],
      ],
      raw: true,
    });

    res.json({
      success: true,
      data: {
        statusStats: {
          open: stats[0],
          inProgress: stats[1],
          resolved: stats[2],
          closed: stats[3],
        },
        priorityStats: {
          critical: stats[4],
          high: stats[5],
          escalated: stats[6],
        },
        total: stats[7],
        ticketsByType: ticketsByType.reduce((acc, item) => {
          acc[item.ticketType] = parseInt(item.count);
          return acc;
        }, {}),
        averageResolutionTime: avgResolutionTime?.avgTime || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching ticket stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch ticket statistics",
      error: error.message,
    });
  }
};

const getTicketHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const offset = (page - 1) * limit;

    const { count, rows } = await TicketLog.findAndCountAll({
      where: { ticketId: id },
      include: [
        { model: User, as: "user", attributes: ["id", "username", "email"] },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      data: {
        logs: rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching ticket history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch ticket history",
      error: error.message,
    });
  }
};

const deleteTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { deletedBy } = req.body;

    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    // Delete associated files before deleting ticket
    if (ticket.attachments && ticket.attachments.length > 0) {
      deleteFiles(ticket.attachments);
    }

    await ticket.destroy(); // This will soft delete due to paranoid: true

    // Log the deletion
    await logTicketAction(
      ticket.id,
      deletedBy,
      "Deleted",
      "Active",
      "Deleted",
      req,
      "Ticket deleted"
    );

    res.json({
      success: true,
      message: "Ticket deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting ticket:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete ticket",
      error: error.message,
    });
  }
};

module.exports = {
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
};
