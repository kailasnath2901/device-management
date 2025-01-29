const userService = require("../services/user.services");

exports.signup = async (req, res) => {
  try {
    const user = await userService.signup(req.body);
    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.login = async (req, res) => {
  try {
    const result = await userService.login(req.body.email, req.body.password);
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers(req.user);
    res.json({
      success: true,
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const updatedUser = await userService.updateUserRole(
      req.user,
      userId,
      role
    );
    res.json({
      success: true,
      message: "User role updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.createAdminBySuper = async (req, res) => {
  try {
    const admin = await userService.createAdminBySuper(req.user, req.body);
    res.status(201).json({
      success: true,
      message: "Admin created successfully",
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


exports.getAcquiredProjects = async (req, res) => {
  try {
    const { page = 1, limit = 5 } = req.query;
    const result = await userService.getAcquiredProjects(
      req.user.id, 
      { 
        page: parseInt(page), 
        limit: parseInt(limit) 
      }
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};