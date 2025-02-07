const Project = require("../model/project.model");
const ProjectFile = require("../model/project-files.model");
const UserProjectAcquisition = require("../model/user-project-acquisition.model")
const { Sequelize } = require('sequelize');
const sequelize = require('../config/sequelize');
const path = require("path");


class ProjectService {

  async createProject(userId, projectData, files) {
    // Set initial version as 1 for new projects
    const project = await Project.create({
      ...projectData,
      version: 1,  // Add initial version
      userId,
    });
  
    if (files && files.length > 0) {
      const projectFiles = files.map((file) => ({
        projectId: project.id,
        filename: file.filename,
        fileType: path.extname(file.originalname),
        fileSize: file.size,
        filePath: file.path,
        mimetype: file.mimetype,
      }));
  
      await ProjectFile.bulkCreate(projectFiles);
    }
  
    return Project.findByPk(project.id, {
      include: [{
        model: ProjectFile,
        as: 'files'
      }]
    });
  }


async updateProjectFirmware(projectId, newFirmwareVersion, userRole) {
  if (userRole !== 'admin' && userRole !== 'super_admin') {
    throw new Error("Unauthorized: Only admins can update project firmware");
  }

  const project = await Project.findByPk(projectId, {
    include: [{
      model: ProjectFile,
      as: 'files'
    }]
  });

  if (!project) {
    throw new Error("Project not found");
  }

  project.firmwareVersion = newFirmwareVersion;
  project.lastUpdated = new Date();
  await project.save();

  return project;
}

  async getUserProjects(userId, userRole, options = {}) {
    const { page = 1, limit = 10 } = options;
  
    const whereCondition = userRole === 'admin' || userRole === 'super_admin' || userRole == 'user'
      ? {} // No filter for admin/super_admin 
      : { userId }; // Filter by user ID for regular users
  
    const { count, rows: projects } = await Project.findAndCountAll({
      where: whereCondition,
      include: [{
        model: ProjectFile,
        as: 'files'
      }],
      limit,
      offset: (page - 1) * limit,
      order: [['createdAt', 'DESC']]
    });
  
    return {
      projects,
      totalProjects: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    };
  }
  async deleteProject(projectId, userId, userRole) {
    const transaction = await sequelize.transaction();
  
    try {
      // Delete associated user project acquisitions first
      await UserProjectAcquisition.destroy({
        where: { projectId },
        transaction
      });
  
      // Rest of the existing deletion logic remains the same
      const project = await Project.findByPk(projectId, {
        include: [{ model: ProjectFile, as: 'files' }],
        transaction
      });
  
      // Authorization and other checks...
      await ProjectFile.destroy({
        where: { projectId: project.id },
        transaction
      });
  
      await project.destroy({ transaction });
      await transaction.commit();
  
      return project;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }



  async getCurrentUserVersion(userId) {
    const latestAcquisition = await UserProjectAcquisition.findOne({
      where: { userId },
      order: [['firmwareVersion', 'DESC']]
    });
    return latestAcquisition?.firmwareVersion || '1.0';
  }

  async getAcquiredProjects(userId, options = {}) {
    const { page = 1, limit = 10 } = options;
  
    // Get current user version
    const currentVersion = await this.getCurrentUserVersion(userId);
  
    const { count, rows: acquisitions } = await UserProjectAcquisition.findAndCountAll({
      where: { userId },
      include: [{
        model: Project,
        include: [{
          model: ProjectFile,
          as: 'files'
        }]
      }],
      limit,
      offset: (page - 1) * limit,
      order: [['createdAt', 'DESC']]
    });
  
    return {
      success: true,
      currentFirmwareVersion: currentVersion, // Add current version to response
      projects: acquisitions.map(acquisition => ({
        ...acquisition.Project.toJSON(),
        acquiredAt: acquisition.createdAt
      })),
      totalProjectsAcquired: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    };
  }

  async updateUserProjectFirmware(userId, projectId, newFirmwareVersion) {
    const acquisition = await UserProjectAcquisition.findOne({
      where: {
        userId,
        projectId
      }
    });
  
    if (!acquisition) {
      throw new Error('Project acquisition not found');
    }
  
    acquisition.firmwareVersion = newFirmwareVersion;
    await acquisition.save();
  
    return acquisition;
  }

  incrementFirmwareVersion(version) {
    const versionNum = parseFloat(version);
    return (versionNum + 0.1).toFixed(1);
  }


  async acquireProject(userId, projectId) {
    const transaction = await sequelize.transaction();
    
    try {
      const project = await Project.findByPk(projectId);
      if (!project) {
        throw new Error('Project not found');
      }
  
      const existingAcquisition = await UserProjectAcquisition.findOne({
        where: { userId, projectId },
        transaction
      });
  
      if (existingAcquisition) {
        throw new Error('Project already acquired');
      }
      
      const currentAcquisitions = await UserProjectAcquisition.count({
        where: { userId }
      });
      
      if (currentAcquisitions >= 5) {
        throw new Error('Maximum project acquisitions reached');
      }
      
      // Check if there has been a removal
      const hasRemoval = await UserProjectAcquisition.findOne({
        where: { 
          userId,
          hasRemovalOccurred: true
        }
      });

      // Get current version
      const userVersion = await this.getCurrentUserVersion(userId);
      
      // Only increment version if there was a previous removal
      const newVersion = hasRemoval ? this.incrementFirmwareVersion(userVersion) : userVersion;
      
      // Update ALL existing acquisitions to new version and reset the removal flag
      await UserProjectAcquisition.update(
        { 
          firmwareVersion: newVersion,
          hasRemovalOccurred: false  // Reset the flag after incrementing
        },
        { 
          where: { userId },
          transaction
        }
      );
      
      // Create new acquisition with same version
      const acquisition = await UserProjectAcquisition.create({
        userId,
        projectId,
        firmwareVersion: newVersion,
        hasRemovalOccurred: false
      }, { transaction });
      
      await transaction.commit();
      return {
        success: true,
        firmwareVersion: newVersion,
        acquisition
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

 

  async removeAcquiredProject(userId, projectId) {
    const transaction = await sequelize.transaction();
    
    try {
      const existingAcquisition = await UserProjectAcquisition.findOne({
        where: { userId, projectId }
      });

      if (!existingAcquisition) {
        throw new Error('Project acquisition not found');
      }

      // Delete the acquisition
      await UserProjectAcquisition.destroy({
        where: { userId, projectId },
        transaction
      });

      // Get current version but don't increment it
      const currentVersion = await this.getCurrentUserVersion(userId);

      // Set a flag in the database to indicate a removal has occurred
      await UserProjectAcquisition.update(
        { hasRemovalOccurred: true },
        { 
          where: { userId },
          transaction 
        }
      );

      await transaction.commit();

      return {
        success: true,
        currentFirmwareVersion: currentVersion,
        remainingCount: await UserProjectAcquisition.count({ where: { userId } })
      };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

}

module.exports = new ProjectService();
