// services/user.services.js - Updated with email OTP verification
const User = require('../model/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const Project = require("../model/project.model");
const UserProjectAcquisition = require("../model/user-project-acquisition.model");
const ProjectFile = require("../model/project-files.model");
const OTPService = require('./otp.service');
const EmailService = require('./email.services');

class UserService {
  // Modified signup - creates user but doesn't verify email yet
  async signup(userData) {
    const { username, email, password, mobile_no } = userData;
    
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new Error('User already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user with email unverified
    const user = await User.create({
      username, 
      email, 
      password: hashedPassword,
      mobile_no,
      role: 'user',
      is_email_verified: false // Default is false
    });

    // Send verification OTP
    await OTPService.generateAndSendOTP(email, 'email_verification');

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        is_email_verified: user.is_email_verified
      },
      message: 'User created successfully. Please verify your email with the OTP sent to your email address.'
    };
  }

  // New method: Verify email with OTP
  async verifyEmail(email, otp) {
    try {
      // Verify OTP
      await OTPService.verifyOTP(email, otp, 'email_verification');

      // Find and update user
      const user = await User.findOne({ where: { email } });
      if (!user) {
        throw new Error('User not found');
      }

      if (user.is_email_verified) {
        throw new Error('Email already verified');
      }

      // Update user as verified
      await user.update({ is_email_verified: true });

      // Send welcome email
      await EmailService.sendWelcomeEmail(email, user.username);

      return {
        success: true,
        message: 'Email verified successfully',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          is_email_verified: user.is_email_verified
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // New method: Resend verification OTP
  async resendVerificationOTP(email) {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new Error('User not found');
    }

    if (user.is_email_verified) {
      throw new Error('Email already verified');
    }

    return await OTPService.generateAndSendOTP(email, 'email_verification');
  }

  // Regular login (password-based)
  async login(email, password) {
    const user = await User.findOne({ 
      where: { 
        email,
        is_active: true
      } 
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if email is verified
    if (!user.is_email_verified) {
      throw new Error('Please verify your email before logging in');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    await user.update({ last_login: new Date() });

    return { 
      token, 
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        is_email_verified: user.is_email_verified
      }
    };
  }

  // New method: OTP-based login (request OTP)
  async requestLoginOTP(email) {
    const user = await User.findOne({ 
      where: { 
        email,
        is_active: true,
        is_email_verified: true
      } 
    });

    if (!user) {
      throw new Error('User not found or email not verified');
    }

    return await OTPService.generateAndSendOTP(email, 'login');
  }

  // New method: OTP-based login (verify OTP and login)
  async loginWithOTP(email, otp) {
    try {
      // Verify OTP
      await OTPService.verifyOTP(email, otp, 'login');

      // Find user
      const user = await User.findOne({ 
        where: { 
          email,
          is_active: true,
          is_email_verified: true
        } 
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Generate token
      const token = jwt.sign(
        { 
          id: user.id, 
          role: user.role 
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      await user.update({ last_login: new Date() });

      return { 
        token, 
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          is_email_verified: user.is_email_verified
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Existing methods remain the same...
  async getAllUsers(requestingUser) {
    const queryOptions = {
      attributes: ['id', 'username', 'email', 'role', 'createdAt', 'last_login', 'is_email_verified', 'user_category', 'coupon_points']
    };

    if (requestingUser.role === 'super_admin') {
      return User.findAll(queryOptions);
    }

    if (requestingUser.role === 'admin') {
      queryOptions.where = {
        role: 'user'
      };
      return User.findAll(queryOptions);
    }

    throw new Error('Unauthorized access');
  }

  async updateUserRole(requestingUser, userId, newRole) {
    if (requestingUser.role !== 'super_admin') {
      throw new Error('Unauthorized to change user roles');
    }

    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.role === 'super_admin') {
      throw new Error('Cannot modify super admin role');
    }

    return user.update({ role: newRole });
  }

  async createAdminBySuper(requestingUser, adminData) {
    if (requestingUser.role !== 'super_admin') {
      throw new Error('Unauthorized to create admin');
    }

    const { username, email, password } = adminData;
    
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new Error('User already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Admin created by super admin is automatically verified
    return User.create({
      username, 
      email, 
      password: hashedPassword,
      role: 'admin',
      is_email_verified: true
    });
  }

  async getAcquiredProjects(userId, options = {}) {
    const { page = 1, limit = 10 } = options;
  
    const { count, rows: acquisitions } = await UserProjectAcquisition.findAndCountAll({
      where: { userId },
      include: [{
        model: Project,
        include: [{
          model: ProjectFile,
          as: 'files'
        }],
        attributes: { 
          include: [
            'id', 'name', 'description', 'youtubeLink', 
            'projectType', 'maxAcquisitions', 'userId', 
            'createdAt', 'updatedAt'
          ]
        }
      }],
      limit,
      offset: (page - 1) * limit,
      order: [['createdAt', 'DESC']]
    });
  
    const latestAcquisition = await UserProjectAcquisition.findOne({
      where: { userId },
      order: [['firmwareVersion', 'DESC']]
    });
  
    return {
      success: true,
      projects: acquisitions.map(acquisition => ({
        ...acquisition.Project.toJSON(),
        firmwareVersion: acquisition.firmwareVersion,
        acquiredAt: acquisition.createdAt
      })),
      totalProjectsAcquired: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      currentFirmwareVersion: latestAcquisition?.firmwareVersion || '1.0.0'
    };
  }

  incrementFirmwareVersion(version) {
    const versionNum = parseFloat(version);
    return (versionNum + 0.1).toFixed(1);
  }
}

module.exports = new UserService();