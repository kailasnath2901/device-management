// controllers/user.controller.js - Updated with OTP endpoints
const userService = require("../services/user.services");

// Existing signup - now sends OTP
exports.signup = async (req, res) => {
  try {
    const result = await userService.signup(req.body);
    res.status(201).json({
      success: true,
      message: result.message,
      user: result.user,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// New: Verify email with OTP
exports.verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const result = await userService.verifyEmail(email, otp);
    res.json({
      success: true,
      message: result.message,
      user: result.user,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// New: Resend verification OTP
exports.resendVerificationOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const result = await userService.resendVerificationOTP(email);
    res.json({
      success: true,
      message: result.message,
      expiresIn: result.expiresIn,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Existing login (password-based)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const result = await userService.login(email, password);
    res.json({
      success: true,
      message: "Login successful",
      ...result,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message,
    });
  }
};

// New: Request OTP for login
exports.requestLoginOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const result = await userService.requestLoginOTP(email);
    res.json({
      success: true,
      message: result.message,
      expiresIn: result.expiresIn,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// New: Login with OTP
exports.loginWithOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const result = await userService.loginWithOTP(email, otp);
    res.json({
      success: true,
      message: "Login successful",
      ...result,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message,
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const result = await userService.requestPasswordResetOTP(email);
    res.json({
      success: true,
      message: result.message,
      expiresIn: result.expiresIn,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// NEW: Reset Password with OTP
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP, and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const result = await userService.resetPasswordWithOTP(
      email,
      otp,
      newPassword
    );
    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// NEW: Change Password (requires authentication and current password)
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id; // From auth middleware

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password",
      });
    }

    const result = await userService.changePassword(
      userId,
      currentPassword,
      newPassword
    );
    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// NEW: Delete User (for admin and super_admin)
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUser = req.user;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const result = await userService.forceDeleteUser(requestingUser, userId);
    res.json({
      success: true,
      message: result.message,
      deletedUser: result.deletedUser,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


// Existing controllers remain the same...
exports.getAllUsers = async (req, res) => {
  try {
    // Extract pagination parameters from query string
    const { page, limit } = req.query;

    // Validate pagination parameters
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;

    // Validate page and limit values
    if (pageNum < 1) {
      return res.status(400).json({
        success: false,
        message: "Page number must be greater than 0",
      });
    }

    if (limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        message: "Limit must be between 1 and 100",
      });
    }

    const result = await userService.getAllUsers(req.user, {
      page: pageNum,
      limit: limitNum,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error in getAllUsers:", error);

    if (error.message === "Unauthorized access") {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
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
    const result = await userService.getAcquiredProjects(req.user.id, {
      page: parseInt(page),
      limit: parseInt(limit),
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}


  exports.uploadProfileAvatar = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await userProfileService.uploadProfileAvatar(userId, req.file);

    res.status(200).json({
      success: true,
      message: result.message,
      profileAvatar: result.profileAvatar,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get profile avatar
 * GET /api/user/avatar
 */
exports.getProfileAvatar = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await userProfileService.getProfileAvatar(userId);

    res.json({
      success: result.success,
      message: result.message,
      profileAvatar: result.profileAvatar,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Delete profile avatar
 * DELETE /api/user/avatar
 */
exports.deleteProfileAvatar = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await userProfileService.deleteProfileAvatar(userId);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ============== EXTRA DATA ENDPOINTS ==============

/**
 * Update extradata field
 * PUT /api/user/extradata/:fieldName
 * Body: { data: any }
 */
exports.updateExtraData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fieldName } = req.params;
    const { data } = req.body;

    if (data === undefined) {
      return res.status(400).json({
        success: false,
        message: "Data field is required",
      });
    }

    const result = await userProfileService.updateExtraData(userId, fieldName, data);

    res.json({
      success: true,
      message: result.message,
      [fieldName]: result[fieldName],
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get single extradata field
 * GET /api/user/extradata/:fieldName
 */
exports.getExtraData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fieldName } = req.params;

    const result = await userProfileService.getExtraData(userId, fieldName);

    res.json({
      success: true,
      [fieldName]: result[fieldName],
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get all extradata fields
 * GET /api/user/extradata
 */
exports.getAllExtraData = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await userProfileService.getAllExtraData(userId);

    res.json({
      success: true,
      extradata1: result.extradata1,
      extradata2: result.extradata2,
      extradata3: result.extradata3,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Delete extradata field
 * DELETE /api/user/extradata/:fieldName
 */
exports.deleteExtraData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fieldName } = req.params;

    const result = await userProfileService.deleteExtraData(userId, fieldName);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Merge/Update nested data in extradata field
 * PATCH /api/user/extradata/:fieldName/merge
 * Body: { data: object }
 */
exports.mergeExtraData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fieldName } = req.params;
    const { data } = req.body;

    if (!data || typeof data !== "object") {
      return res.status(400).json({
        success: false,
        message: "Data field is required and must be an object",
      });
    }

    const result = await userProfileService.mergeExtraData(userId, fieldName, data);

    res.json({
      success: true,
      message: result.message,
      [fieldName]: result[fieldName],
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
