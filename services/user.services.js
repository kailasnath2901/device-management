// services/user.services.js - Updated with email OTP verification
const User = require("../model/user.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const Project = require("../model/project.model");
const UserProjectAcquisition = require("../model/user-project-acquisition.model");
const ProjectFile = require("../model/project-files.model");
const OTPService = require("./otp.service");
const EmailService = require("./email.services");
const Device = require("../model/user-device.model");
const Ticket = require("../model/ticket.model");
const OTP = require("../model/otp.model");
const fs = require('fs');
const path = require('path');

class UserService {
  async signup(userData) {
    try {
      const { username, email, password, mobile_no } = userData;

      // Check for existing users (including inactive ones)
      // Use 'withDeleted' scope instead of 'withInactive'
      const existingUser = await User.scope("withDeleted").findOne({
        where: {
          [Op.or]: [{ email }, { username }],
        },
      });

      if (existingUser) {
        if (existingUser.email === email) {
          throw new Error("Email already exists");
        }
        if (existingUser.username === username) {
          throw new Error("Username already exists");
        }
      }

      // Validate mobile number format if provided
      if (mobile_no && mobile_no.trim() !== "") {
        const cleanMobile = mobile_no.toString().trim();
        if (!/^\d{10}$/.test(cleanMobile)) {
          throw new Error("Mobile number must be exactly 10 digits");
        }
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = await User.create({
        username: username.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        mobile_no:
          mobile_no && mobile_no.trim() !== "" ? mobile_no.trim() : null,
        role: "user",
        is_email_verified: false,
        is_active: true,
      });

      await OTPService.generateAndSendOTP(email, "email_verification");

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          is_email_verified: user.is_email_verified,
        },
        message:
          "User created successfully. Please verify your email with the OTP sent to your email address.",
      };
    } catch (error) {
      console.error("Signup error:", error);

      // Handle Sequelize validation errors
      if (error.name === "SequelizeValidationError") {
        const validationErrors = error.errors.map((err) => err.message);
        throw new Error(`Validation failed: ${validationErrors.join(", ")}`);
      }

      if (error.name === "SequelizeUniqueConstraintError") {
        throw new Error("Email or username already exists");
      }

      throw error;
    }
  }

  // Fixed verifyEmail method
  async verifyEmail(email, otp) {
    try {
      // Verify OTP
      await OTPService.verifyOTP(email, otp, "email_verification");

      // Find user using withDeleted scope to include inactive users
      const user = await User.scope("withDeleted").findOne({
        where: { email },
      });
      if (!user) {
        throw new Error("User not found");
      }

      if (user.is_email_verified) {
        throw new Error("Email already verified");
      }

      // Update user as verified and activate if needed
      await user.update({
        is_email_verified: true,
        is_active: true, // Reactivate user when email is verified
      });

      // Send welcome email
      await EmailService.sendWelcomeEmail(email, user.username);

      return {
        success: true,
        message: "Email verified successfully",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          is_email_verified: user.is_email_verified,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // New method: Resend verification OTP
  async resendVerificationOTP(email) {
    const user = await User.scope("withDeleted").findOne({ where: { email } });
    if (!user) {
      throw new Error("User not found");
    }

    if (user.is_email_verified) {
      throw new Error("Email already verified");
    }

    return await OTPService.generateAndSendOTP(email, "email_verification");
  }

  // Regular login (password-based)
  async login(email, password) {
    const user = await User.findOne({
      where: {
        email,
        is_active: true,
      },
    });

    if (!user) {
      throw new Error("Invalid credentials");
    }

    // Check if email is verified
    if (!user.is_email_verified) {
      throw new Error("Please verify your email before logging in");
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error("Invalid credentials");
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    await user.update({ last_login: new Date() });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        is_email_verified: user.is_email_verified,
      },
    };
  }

  // New method: OTP-based login (request OTP)
  async requestLoginOTP(email) {
    const user = await User.findOne({
      where: {
        email,
        is_active: true,
        is_email_verified: true,
      },
    });

    if (!user) {
      throw new Error("User not found or email not verified");
    }

    return await OTPService.generateAndSendOTP(email, "login");
  }

  // New method: OTP-based login (verify OTP and login)
  async loginWithOTP(email, otp) {
    try {
      // Verify OTP
      await OTPService.verifyOTP(email, otp, "login");

      // Find user
      const user = await User.findOne({
        where: {
          email,
          is_active: true,
          is_email_verified: true,
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Generate token
      const token = jwt.sign(
        {
          id: user.id,
          role: user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      await user.update({ last_login: new Date() });

      return {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          is_email_verified: user.is_email_verified,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async getAllUsers(requestingUser, options = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    const queryOptions = {
      attributes: [
        "id",
        "username",
        "email",
        "role",
        "createdAt",
        "last_login",
        "is_email_verified",
        "user_category",
        "coupon_points",
      ],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: [["createdAt", "DESC"]], // Order by creation date, newest first
      distinct: true, // Ensure accurate count
    };

    if (requestingUser.role === "super_admin") {
      // Super admin can see all users
      const { count, rows } = await User.findAndCountAll(queryOptions);

      return {
        users: rows,
        totalUsers: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page, 10),
        hasNextPage: page < Math.ceil(count / limit),
        hasPrevPage: page > 1,
      };
    }

    if (requestingUser.role === "admin") {
      // Admin can only see regular users
      queryOptions.where = {
        role: "user",
      };

      const { count, rows } = await User.findAndCountAll(queryOptions);

      return {
        users: rows,
        totalUsers: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page, 10),
        hasNextPage: page < Math.ceil(count / limit),
        hasPrevPage: page > 1,
      };
    }

    throw new Error("Unauthorized access");
  }

  async requestPasswordResetOTP(email) {
    const user = await User.findOne({
      where: {
        email,
        is_active: true,
        is_email_verified: true,
      },
    });

    if (!user) {
      throw new Error("User not found or email not verified");
    }

    return await OTPService.generateAndSendOTP(email, "password_reset");
  }

  // NEW: Reset Password with OTP
  async resetPasswordWithOTP(email, otp, newPassword) {
    try {
      // Verify OTP
      await OTPService.verifyOTP(email, otp, "password_reset");

      // Find user
      const user = await User.findOne({
        where: {
          email,
          is_active: true,
          is_email_verified: true,
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Update password
      await user.update({ password: hashedPassword });

      return {
        success: true,
        message: "Password reset successfully",
      };
    } catch (error) {
      throw error;
    }
  }

  // NEW: Change Password (requires current password verification)
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findOne({
      where: {
        id: userId,
        is_active: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isCurrentPasswordValid) {
      throw new Error("Current password is incorrect");
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await user.update({ password: hashedPassword });

    return {
      success: true,
      message: "Password changed successfully",
    };
  }


  async forceDeleteUser(requestingUser, targetUserId) {
    // Check permissions
    if (!["admin", "super_admin"].includes(requestingUser.role)) {
      throw new Error("Unauthorized to delete users");
    }

    // Find target user (including inactive ones)
    const targetUser = await User.scope("withDeleted").findOne({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new Error("User not found");
    }

    // Prevent deletion of super_admin by admin
    if (requestingUser.role === "admin" && targetUser.role === "super_admin") {
      throw new Error("Admins cannot delete super admins");
    }

    // Prevent deletion of admin by admin
    if (requestingUser.role === "admin" && targetUser.role === "admin") {
      throw new Error("Admins cannot delete other admins");
    }

    // Prevent self-deletion
    if (requestingUser.id === targetUser.id) {
      throw new Error("Cannot delete your own account");
    }

    const deletedUserInfo = {
      id: targetUser.id,
      username: targetUser.username,
      email: targetUser.email,
      role: targetUser.role,
    };

    // Start transaction for safe deletion
    const transaction = await User.sequelize.transaction();

    try {
      // Get counts for reporting
      const acquisitionsCount = await UserProjectAcquisition.count({
        where: { userId: targetUserId },
        transaction,
      });

      const devicesCount = await Device.count({
        where: { userId: targetUserId },
        transaction,
      });

      // Delete all associated data in correct order (respecting foreign key constraints)

      // 1. Update tickets assigned to this user (clear references)
      await Ticket.update(
        { assignedTo: null },
        {
          where: { assignedTo: targetUserId },
          transaction,
        }
      );

      // 2. Update tickets resolved by this user (clear references)
      await Ticket.update(
        { resolvedBy: null },
        {
          where: { resolvedBy: targetUserId },
          transaction,
        }
      );

      // 3. Update tickets escalated to this user (clear references)
      await Ticket.update(
        { escalatedTo: null },
        {
          where: { escalatedTo: targetUserId },
          transaction,
        }
      );

      // 4. Delete user's tickets (after clearing references)
      await Ticket.destroy({
        where: { userId: targetUserId },
        transaction,
      });

      // 5. Delete user project acquisitions first (before devices due to FK constraint)
      if (UserProjectAcquisition) {
        await UserProjectAcquisition.destroy({
          where: { userId: targetUserId },
          transaction,
        });
      }

      // 6. Delete user's devices (after project acquisitions)
      await Device.destroy({
        where: { userId: targetUserId },
        transaction,
      });

      // 7. Delete OTP records
      if (OTP) {
        await OTP.destroy({
          where: { email: targetUser.email },
          transaction,
        });
      }

      // 8. Finally, delete the user completely (hard delete)
      await User.scope("withDeleted").destroy({
        where: { id: targetUserId },
        transaction,
      });

      await transaction.commit();

      return {
        success: true,
        message: "User and all associated data deleted permanently",
        deletedUser: deletedUserInfo,
        deletedData: {
          projectAcquisitions: acquisitionsCount,
          devices: devicesCount,
        },
      };
    } catch (error) {
      await transaction.rollback();
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }


  // Method to clean up existing soft-deleted records
  async cleanupSoftDeletedUsers() {
    const transaction = await User.sequelize.transaction();

    try {
      // Find all users with deleted_at not null or is_active false
      const softDeletedUsers = await User.scope("withInactive").findAll({
        where: {
          [Op.or]: [{ is_active: false }, { deleted_at: { [Op.ne]: null } }],
        },
        transaction,
      });

      console.log(
        `Found ${softDeletedUsers.length} soft-deleted users to clean up`
      );

      for (const user of softDeletedUsers) {
        // Delete associated data
        await Device.destroy({
          where: { userId: user.id },
          transaction,
        });

        await OTP.destroy({
          where: { email: user.email },
          transaction,
        });

        if (UserProjectAcquisition) {
          await UserProjectAcquisition.destroy({
            where: { userId: user.id },
            transaction,
          });
        }

        // Hard delete the user
        await User.scope("withInactive").destroy({
          where: { id: user.id },
          transaction,
        });
      }

      await transaction.commit();

      return {
        success: true,
        message: `Cleaned up ${softDeletedUsers.length} soft-deleted users`,
        count: softDeletedUsers.length,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async updateUserRole(requestingUser, userId, newRole) {
    if (requestingUser.role !== "super_admin") {
      throw new Error("Unauthorized to change user roles");
    }

    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.role === "super_admin") {
      throw new Error("Cannot modify super admin role");
    }

    return user.update({ role: newRole });
  }

  async createAdminBySuper(requestingUser, adminData) {
    if (requestingUser.role !== "super_admin") {
      throw new Error("Unauthorized to create admin");
    }

    const { username, email, password } = adminData;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new Error("User already exists");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Admin created by super admin is automatically verified
    return User.create({
      username,
      email,
      password: hashedPassword,
      role: "admin",
      is_email_verified: true,
    });
  }

  async getAcquiredProjects(userId, options = {}) {
    const { page = 1, limit = 10 } = options;

    const { count, rows: acquisitions } =
      await UserProjectAcquisition.findAndCountAll({
        where: { userId },
        include: [
          {
            model: Project,
            include: [
              {
                model: ProjectFile,
                as: "files",
              },
            ],
            attributes: {
              include: [
                "id",
                "name",
                "description",
                "youtubeLink",
                "projectType",
                "maxAcquisitions",
                "userId",
                "createdAt",
                "updatedAt",
              ],
            },
          },
        ],
        limit,
        offset: (page - 1) * limit,
        order: [["createdAt", "DESC"]],
      });

    const latestAcquisition = await UserProjectAcquisition.findOne({
      where: { userId },
      order: [["firmwareVersion", "DESC"]],
    });

    return {
      success: true,
      projects: acquisitions.map((acquisition) => ({
        ...acquisition.Project.toJSON(),
        firmwareVersion: acquisition.firmwareVersion,
        acquiredAt: acquisition.createdAt,
      })),
      totalProjectsAcquired: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      currentFirmwareVersion: latestAcquisition?.firmwareVersion || "1.0.0",
    };
  }

  // services/user-profile.service.js - FIXED uploadProfileAvatar method
  async uploadProfileAvatar(userId, file) {
    try {
      if (!file) {
        throw new Error("No file provided");
      }

      const user = await User.scope("withDeleted").findOne({
        where: { id: userId }
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Create user-specific directory
      const userUploadsDir = path.join(
        __dirname,
        '../uploads/users',
        userId.toString()
      );

      if (!fs.existsSync(userUploadsDir)) {
        fs.mkdirSync(userUploadsDir, { recursive: true });
      }

      // Delete old avatar if exists
      if (user.profileAvatar) {
        const oldFilename = user.profileAvatar.split('/').pop();
        const oldAvatarPath = path.join(userUploadsDir, oldFilename);

        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath);
        }
      }

      // Move file from temp directory to user directory
      const tempPath = file.path;
      const newPath = path.join(userUploadsDir, file.filename);

      fs.renameSync(tempPath, newPath);

      // Store relative path in database
      const avatarPath = `uploads/users/${userId}/${file.filename}`;

      await user.update({ profileAvatar: avatarPath });

      return {
        success: true,
        message: "Avatar uploaded successfully",
        profileAvatar: avatarPath,
      };
    } catch (error) {
      // Clean up uploaded file if there's an error
      if (file && file.path && fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
        } catch (deleteError) {
          console.error("Error deleting temp file:", deleteError);
        }
      }
      throw error;
    }
  }


  /**
   * Get user profile avatar
   */
  async getProfileAvatar(userId) {
    try {
      const user = await User.scope("withDeleted").findOne({
        where: { id: userId },
        attributes: ["id", "username", "profileAvatar"]
      });

      if (!user) {
        throw new Error("User not found");
      }

      if (!user.profileAvatar) {
        return {
          success: false,
          message: "No avatar found for this user",
          profileAvatar: null
        };
      }

      return {
        success: true,
        profileAvatar: user.profileAvatar,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete user profile avatar
   */
  async deleteProfileAvatar(userId) {
    try {
      const user = await User.scope("withDeleted").findOne({
        where: { id: userId }
      });

      if (!user) {
        throw new Error("User not found");
      }

      if (!user.profileAvatar) {
        throw new Error("No avatar to delete");
      }

      // Delete file from storage
      const avatarPath = path.join(
        __dirname,
        '../uploads/users',
        userId.toString(),
        user.profileAvatar.split('/').pop()
      );

      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }

      // Update user record
      await user.update({ profileAvatar: null });

      return {
        success: true,
        message: "Avatar deleted successfully",
      };
    } catch (error) {
      throw error;
    }
  }

  // ============== EXTRA DATA METHODS ==============

  /**
   * Set/Update extradata field
   */
  async updateExtraData(userId, fieldName, data) {
    try {
      if (!["extradata1", "extradata2", "extradata3"].includes(fieldName)) {
        throw new Error("Invalid field name. Must be extradata1, extradata2, or extradata3");
      }

      const user = await User.scope("withDeleted").findOne({
        where: { id: userId }
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Validate data is JSON serializable
      if (data !== null && typeof data === "object") {
        try {
          JSON.stringify(data);
        } catch (e) {
          throw new Error("Data must be JSON serializable");
        }
      }

      await user.update({ [fieldName]: data });

      return {
        success: true,
        message: `${fieldName} updated successfully`,
        [fieldName]: data,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get single extradata field
   */
  async getExtraData(userId, fieldName) {
    try {
      if (!["extradata1", "extradata2", "extradata3"].includes(fieldName)) {
        throw new Error("Invalid field name. Must be extradata1, extradata2, or extradata3");
      }

      const user = await User.scope("withDeleted").findOne({
        where: { id: userId },
        attributes: ["id", fieldName]
      });

      if (!user) {
        throw new Error("User not found");
      }

      return {
        success: true,
        [fieldName]: user[fieldName] || null,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all extradata fields
   */
  async getAllExtraData(userId) {
    try {
      const user = await User.scope("withDeleted").findOne({
        where: { id: userId },
        attributes: ["id", "extradata1", "extradata2", "extradata3"]
      });

      if (!user) {
        throw new Error("User not found");
      }

      return {
        success: true,
        extradata1: user.extradata1 || null,
        extradata2: user.extradata2 || null,
        extradata3: user.extradata3 || null,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete single extradata field
   */
  async deleteExtraData(userId, fieldName) {
    try {
      if (!["extradata1", "extradata2", "extradata3"].includes(fieldName)) {
        throw new Error("Invalid field name. Must be extradata1, extradata2, or extradata3");
      }

      const user = await User.scope("withDeleted").findOne({
        where: { id: userId }
      });

      if (!user) {
        throw new Error("User not found");
      }

      if (!user[fieldName]) {
        throw new Error(`${fieldName} is already empty`);
      }

      await user.update({ [fieldName]: null });

      return {
        success: true,
        message: `${fieldName} deleted successfully`,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Merge/Update nested data in extradata field
   */
  async mergeExtraData(userId, fieldName, dataToMerge) {
    try {
      if (!["extradata1", "extradata2", "extradata3"].includes(fieldName)) {
        throw new Error("Invalid field name. Must be extradata1, extradata2, or extradata3");
      }

      const user = await User.scope("withDeleted").findOne({
        where: { id: userId }
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Get current data
      const currentData = user[fieldName] || {};

      // Merge with new data
      const mergedData = { ...currentData, ...dataToMerge };

      await user.update({ [fieldName]: mergedData });

      return {
        success: true,
        message: `${fieldName} merged successfully`,
        [fieldName]: mergedData,
      };
    } catch (error) {
      throw error;
    }
  }

  incrementFirmwareVersion(version) {
    const versionNum = parseFloat(version);
    return (versionNum + 0.1).toFixed(1);
  }
}

module.exports = new UserService();
