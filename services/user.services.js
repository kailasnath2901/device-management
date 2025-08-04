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

class UserService {
  async signup(userData) {
    const { username, email, password, mobile_no } = userData;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new Error("User already exists");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user with email unverified
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      mobile_no,
      role: "user",
      is_email_verified: false, // Default is false
    });

    // Send verification OTP
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
  }

  // New method: Verify email with OTP
  async verifyEmail(email, otp) {
    try {
      // Verify OTP
      await OTPService.verifyOTP(email, otp, "email_verification");

      // Find and update user
      const user = await User.findOne({ where: { email } });
      if (!user) {
        throw new Error("User not found");
      }

      if (user.is_email_verified) {
        throw new Error("Email already verified");
      }

      // Update user as verified
      await user.update({ is_email_verified: true });

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
    const user = await User.findOne({ where: { email } });
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

  async deleteUser(requestingUser, targetUserId) {
    // Check permissions
    if (!["admin", "super_admin"].includes(requestingUser.role)) {
      throw new Error("Unauthorized to delete users");
    }

    // Find target user (including soft-deleted ones for complete cleanup)
    const targetUser = await User.scope("withDeleted").findOne({
      where: {
        id: targetUserId,
      },
    });

    if (!targetUser) {
      throw new Error("User not found");
    }

    // Prevent deletion of super_admin by admin
    if (requestingUser.role === "admin" && targetUser.role === "super_admin") {
      throw new Error("Admins cannot delete super admins");
    }

    // Prevent deletion of admin by admin (only super_admin can delete admins)
    if (requestingUser.role === "admin" && targetUser.role === "admin") {
      throw new Error("Admins cannot delete other admins");
    }

    // Prevent self-deletion
    if (requestingUser.id === targetUser.id) {
      throw new Error("Cannot delete your own account");
    }

    // Store user info before deletion
    const deletedUserInfo = {
      id: targetUser.id,
      username: targetUser.username,
      email: targetUser.email,
      role: targetUser.role,
    };

    // Start transaction for safe deletion
    const transaction = await User.sequelize.transaction();

    try {
      // Delete all associated data first (to avoid foreign key constraints)

      // 1. Delete user's devices
      await Device.destroy({
        where: { userId: targetUserId },
        transaction,
        force: true, // Hard delete
      });

      // 2. Delete user's tickets (created by user)
      await Ticket.destroy({
        where: { userId: targetUserId },
        transaction,
        force: true,
      });

      // 3. Update tickets assigned to this user (set assignedTo to null or reassign)
      await Ticket.update(
        { assignedTo: null },
        {
          where: { assignedTo: targetUserId },
          transaction,
        }
      );

      // 4. Update tickets resolved by this user (set resolvedBy to null)
      await Ticket.update(
        { resolvedBy: null },
        {
          where: { resolvedBy: targetUserId },
          transaction,
        }
      );

      // 5. Update tickets escalated to this user (set escalatedTo to null)
      await Ticket.update(
        { escalatedTo: null },
        {
          where: { escalatedTo: targetUserId },
          transaction,
        }
      );

      // 6. Delete OTP records if exists
      if (OTP) {
        await OTP.destroy({
          where: { email: targetUser.email },
          transaction,
          force: true,
        });
      }

      // 7. Update any records that reference this user as deleted_by
      await User.update(
        { deleted_by: null },
        {
          where: { deleted_by: targetUserId },
          transaction,
        }
      );

      // 8. Finally, delete the user completely
      await User.destroy({
        where: { id: targetUserId },
        transaction,
        force: true, // Hard delete (ignores paranoid)
      });

      // Commit transaction
      await transaction.commit();

      return {
        success: true,
        message: "User and all associated data deleted permanently",
        deletedUser: deletedUserInfo,
      };
    } catch (error) {
      // Rollback transaction on error
      await transaction.rollback();
      throw new Error(`Failed to delete user: ${error.message}`);
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

  incrementFirmwareVersion(version) {
    const versionNum = parseFloat(version);
    return (versionNum + 0.1).toFixed(1);
  }
}

module.exports = new UserService();
