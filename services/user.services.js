const User = require('../model/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const Project = require("../model/project.model");
const UserProjectAcquisition = require("../model/user-project-acquisition.model")
const ProjectFile= require("../model/project-files.model")

class UserService {
  async  signup(userData) {
    const { username, email, password } = userData;
    
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new Error('User already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    return User.create({
      username, 
      email, 
      password: hashedPassword,
      role: 'user'
    });
  }

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
        role: user.role
      }
    };
  }

  async getAllUsers(requestingUser) {
    const queryOptions = {
      attributes: ['id', 'username', 'email', 'role', 'createdAt', 'last_login']
    };

    // Super admin sees all users
    if (requestingUser.role === 'super_admin') {
      return User.findAll(queryOptions);
    }

    // Admin sees non-admin and non-super admin users
    if (requestingUser.role === 'admin') {
      queryOptions.where = {
        role: 'user'
      };
      return User.findAll(queryOptions);
    }

    throw new Error('Unauthorized access');
  }

  async updateUserRole(requestingUser, userId, newRole) {
    // Only super admin can change roles
    if (requestingUser.role !== 'super_admin') {
      throw new Error('Unauthorized to change user roles');
    }

    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Prevent changing super admin role
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

    return User.create({
      username, 
      email, 
      password: hashedPassword,
      role: 'admin'
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
  
    // Calculate latest firmware version
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