// utils/logging.utils.js
const TicketLog = require("../model/ticket-log.model");
const QueryLog = require("../model/query-log.model");

// Log ticket actions
const logTicketAction = async (ticketId, userId, action, oldValue, newValue, req, description = null) => {
  try {
    await TicketLog.create({
      ticketId,
      userId,
      action,
      oldValue: oldValue ? JSON.stringify(oldValue) : null,
      newValue: newValue ? JSON.stringify(newValue) : null,
      description,
      ipAddress: req?.ip || req?.connection?.remoteAddress || null,
      userAgent: req?.get("User-Agent") || null,
    });
  } catch (error) {
    console.error("Error logging ticket action:", error);
    // Don't throw error to avoid disrupting main flow
  }
};

// Log query actions
const logQueryAction = async (queryId, ticketId, userId, action, oldValue, newValue, req, description = null) => {
  try {
    await QueryLog.create({
      queryId,
      ticketId,
      userId,
      action,
      oldValue: oldValue ? JSON.stringify(oldValue) : null,
      newValue: newValue ? JSON.stringify(newValue) : null,
      description,
      ipAddress: req?.ip || req?.connection?.remoteAddress || null,
      userAgent: req?.get("User-Agent") || null,
    });
  } catch (error) {
    console.error("Error logging query action:", error);
    // Don't throw error to avoid disrupting main flow
  }
};

module.exports = {
  logTicketAction,
  logQueryAction,
};