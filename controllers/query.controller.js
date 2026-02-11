const { Op } = require("sequelize");
const Query = require("../model/query.model");
const QueryLog = require("../model/query-log.model");
const Ticket = require("../model/ticket.model");
const User = require("../model/user.model");
const { logQueryAction } = require("../utils/utils.logging");

// Create a new query
const createQuery = async (req, res) => {
  try {
    const {
      ticketId,
      userId,
      queryType,
      title,
      description,
      contactNumber,
      remarks,
      isPublic,
      parentQueryId,
      attachments,
      priority,
    } = req.body;

    // Validate required fields
    if (!ticketId || !userId || !title || !description) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: ticketId, userId, title, description",
      });
    }

    // Verify ticket exists
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Ticket not found",
      });
    }

    const query = await Query.create({
      ticketId,
      userId,
      queryType: queryType || "Question",
      title,
      description,
      contactNumber,
      remarks,
      isPublic: isPublic !== undefined ? isPublic : true,
      parentQueryId,
      attachments: attachments || [],
      priority: priority || "Medium",
    });

    // Log the creation
    await logQueryAction(query.id, ticketId, userId, "Created", null, "Query created", req);

    // Fetch the created query with associations
    const createdQuery = await Query.findByPk(query.id, {
      include: [
        { model: User, as: "user", attributes: ["id", "username", "email"] },
        { model: Ticket, as: "ticket", attributes: ["id", "ticketId", "title", "ticketStatus"] },
        { model: Query, as: "parentQuery", attributes: ["id", "title"] },
      ],
    });

    res.status(201).json({
      success: true,
      message: "Query created successfully",
      data: createdQuery,
    });
  } catch (error) {
    console.error("Error creating query:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create query",
      error: error.message,
    });
  }
};

// Get all queries with filters and pagination
const getQueries = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      ticketId,
      userId,
      queryType,
      isResolved,
      priority,
      isPublic,
      search,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    // Apply filters
    if (ticketId) where.ticketId = ticketId;
    if (userId) where.userId = userId;
    if (queryType) where.queryType = queryType;
    if (isResolved !== undefined) where.isResolved = isResolved === "true";
    if (priority) where.priority = priority;
    if (isPublic !== undefined) where.isPublic = isPublic === "true";

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Query.findAndCountAll({
      where,
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
        { 
          model: Ticket, 
          as: "ticket", 
          attributes: ["id", "ticketId", "title", "ticketStatus"],
          required: false  // ✅ Add this
        },
        { 
          model: Query, 
          as: "parentQuery", 
          attributes: ["id", "title"],
          required: false  // ✅ Add this
        },
        {
          model: Query,
          as: "childQueries",
          attributes: ["id", "title", "queryType", "isResolved"],
          separate: true,  // ✅ Use separate instead of limit
          required: false  // ✅ Add this
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder.toUpperCase()]],
    });

    res.json({
      success: true,
      data: {
        queries: rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching queries:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch queries",
      error: error.message,
    });
  }
};

// Get query by ID
const getQueryById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = await Query.findByPk(id, {
      include: [
        { 
          model: User, 
          as: "user", 
          attributes: ["id", "username", "email", "mobile_no"],
          required: false  // ✅ Add this
        },
        { 
          model: User, 
          as: "resolver", 
          attributes: ["id", "username", "email"],
          required: false  // ✅ Add this
        },
        { 
          model: Ticket, 
          as: "ticket", 
          attributes: ["id", "ticketId", "title", "ticketStatus"],
          required: false  // ✅ Add this
        },
        { 
          model: Query, 
          as: "parentQuery", 
          attributes: ["id", "title", "description"],
          required: false  // ✅ Add this
        },
        {
          model: Query,
          as: "childQueries",
          required: false,  // ✅ Add this
          include: [
            { 
              model: User, 
              as: "user", 
              attributes: ["id", "username", "email"],
              required: false  // ✅ Add this
            },
          ],
          order: [["createdAt", "ASC"]],
        },
        {
          model: QueryLog,
          as: "logs",
          required: false,  // ✅ Add this
          include: [
            { 
              model: User, 
              as: "user", 
              attributes: ["id", "username", "email"],
              required: false  // ✅ Add this
            }
          ],
          order: [["createdAt", "DESC"]],
          limit: 20,
        },
      ],
    });

    if (!query) {
      return res.status(404).json({
        success: false,
        message: "Query not found",
      });
    }

    res.json({
      success: true,
      data: query,
    });
  } catch (error) {
    console.error("Error fetching query:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch query",
      error: error.message,
    });
  }
};

// Mark query as read
const markQueryAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const { readBy } = req.body;

    const query = await Query.findByPk(id);
    
    if (!query) {
      return res.status(404).json({
        success: false,
        message: "Query not found",
      });
    }

    // Only update if not already read
    if (!query.isRead) {
      await query.update({
        isRead: true,
        readAt: new Date(),
        readBy: readBy || null,
      });

      // Log the action
      await logQueryAction(
        query.id,
        query.ticketId,
        readBy,
        "Read",
        false,
        true,
        req,
        "Query marked as read"
      );
    }

    res.json({
      success: true,
      message: "Query marked as read",
      data: {
        isRead: query.isRead,
        readAt: query.readAt,
        readBy: query.readBy,
      },
    });
  } catch (error) {
    console.error("Error marking query as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark query as read",
      error: error.message,
    });
  }
};


// Update query
const updateQuery = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, ...updateData } = req.body;

    const query = await Query.findByPk(id);
    if (!query) {
      return res.status(404).json({
        success: false,
        message: "Query not found",
      });
    }

    // Track changes for logging
    const changes = {};
    Object.keys(updateData).forEach((key) => {
      if (query[key] !== updateData[key]) {
        changes[key] = { old: query[key], new: updateData[key] };
      }
    });

    await query.update(updateData);

    // Log the changes
    for (const [field, change] of Object.entries(changes)) {
      await logQueryAction(
        query.id,
        query.ticketId,
        userId,
        "Updated",
        change.old,
        change.new,
        req,
        `Updated ${field} from ${change.old} to ${change.new}`
      );
    }

    const updatedQuery = await Query.findByPk(id, {
      include: [
        { model: User, as: "user", attributes: ["id", "username", "email"] },
        { model: Ticket, as: "ticket", attributes: ["id", "ticketId", "title"] },
      ],
    });

    res.json({
      success: true,
      message: "Query updated successfully",
      data: updatedQuery,
    });
  } catch (error) {
    console.error("Error updating query:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update query",
      error: error.message,
    });
  }
};

// Resolve query
const resolveQuery = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolvedBy, resolutionNotes } = req.body;

    const query = await Query.findByPk(id);
    if (!query) {
      return res.status(404).json({
        success: false,
        message: "Query not found",
      });
    }

    await query.update({
      isResolved: true,
      resolvedBy,
      resolvedAt: new Date(),
      remarks: resolutionNotes || query.remarks,
    });

    // Log the resolution
    await logQueryAction(
      query.id,
      query.ticketId,
      resolvedBy,
      "Resolved",
      "Unresolved",
      "Resolved",
      req,
      `Query resolved: ${resolutionNotes || "No notes provided"}`
    );

    const updatedQuery = await Query.findByPk(id, {
      include: [
        { model: User, as: "user", attributes: ["id", "username", "email"] },
        { model: User, as: "resolver", attributes: ["id", "username", "email"] },
      ],
    });

    res.json({
      success: true,
      message: "Query resolved successfully",
      data: updatedQuery,
    });
  } catch (error) {
    console.error("Error resolving query:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resolve query",
      error: error.message,
    });
  }
};

// Get query history
const getQueryHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const offset = (page - 1) * limit;

    const { count, rows } = await QueryLog.findAndCountAll({
      where: { queryId: id },
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
    console.error("Error fetching query history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch query history",
      error: error.message,
    });
  }
};

// Delete query (soft delete)
const deleteQuery = async (req, res) => {
  try {
    const { id } = req.params;
    const { deletedBy } = req.body;

    const query = await Query.findByPk(id);
    if (!query) {
      return res.status(404).json({
        success: false,
        message: "Query not found",
      });
    }

    await query.destroy(); // This will soft delete due to paranoid: true

    // Log the deletion
    await logQueryAction(
      query.id,
      query.ticketId,
      deletedBy,
      "Deleted",
      "Active",
      "Deleted",
      req,
      "Query deleted"
    );

    res.json({
      success: true,
      message: "Query deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting query:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete query",
      error: error.message,
    });
  }
};

module.exports = {
  createQuery,
  getQueries,
  getQueryById,
  updateQuery,
  deleteQuery,
  resolveQuery,
  getQueryHistory,
  markQueryAsRead
};