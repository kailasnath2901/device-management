// models/associations.js
const User = require("./user.model");
const Device = require("./user-device.model");
const Ticket = require("./ticket.model");
const Project = require("./project.model");
const Query = require("./query.model");
const TicketLog = require("./ticket-log.model");
const QueryLog = require("./query-log.model");

// Define all associations here to avoid circular dependency issues

// User associations
User.hasMany(Device, {
  foreignKey: "userId",
  as: "devices",
});

User.hasMany(Ticket, {
  foreignKey: "userId",
  as: "tickets",
});

User.hasMany(Ticket, {
  foreignKey: "assignedTo",
  as: "assignedTickets",
});

User.hasMany(Ticket, {
  foreignKey: "resolvedBy",
  as: "resolvedTickets",
});

User.hasMany(Ticket, {
  foreignKey: "escalatedTo",
  as: "escalatedTickets",
});

// Device associations
Device.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

Device.hasMany(Ticket, {
  foreignKey: "deviceId",
  as: "tickets",
});

// Ticket associations
Ticket.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

Ticket.belongsTo(User, {
  foreignKey: "assignedTo",
  as: "assignedUser",
});

Ticket.belongsTo(User, {
  foreignKey: "resolvedBy",
  as: "resolver",
});

Ticket.belongsTo(User, {
  foreignKey: "escalatedTo",
  as: "escalatedUser",
});

Ticket.belongsTo(Device, {
  foreignKey: "deviceId",
  as: "device",
});

Ticket.belongsTo(Project, {
  foreignKey: "projectId",
  as: "project",
});

Ticket.hasMany(Query, {
  foreignKey: "ticketId",
  as: "queries",
});

Ticket.hasMany(TicketLog, {
  foreignKey: "ticketId",
  as: "logs",
});

// Project associations
Project.hasMany(Ticket, {
  foreignKey: "projectId",
  as: "tickets",
});

Query.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

Query.belongsTo(User, {
  foreignKey: "resolvedBy",
  as: "resolver",
});

Query.belongsTo(Ticket, {
  foreignKey: "ticketId",
  as: "ticket",
});

// Self-referential associations for Query
Query.belongsTo(Query, {
  foreignKey: "parentQueryId",
  as: "parentQuery",
});

Query.hasMany(Query, {
  foreignKey: "parentQueryId",
  as: "childQueries",
});

// QueryLog associations
Query.hasMany(QueryLog, {
  foreignKey: "queryId",
  as: "logs",
});

QueryLog.belongsTo(Query, {
  foreignKey: "queryId",
  as: "query",
});

QueryLog.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

QueryLog.belongsTo(Ticket, {
  foreignKey: "ticketId",
  as: "ticket",
});

// TicketLog associations
TicketLog.belongsTo(Ticket, {
  foreignKey: "ticketId",
  as: "ticket",
});

TicketLog.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

module.exports = {
  User,
  Device,
  Ticket,
  Project,
  Query,
  TicketLog,
  QueryLog,
};
