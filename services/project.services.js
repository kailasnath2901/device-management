const Project = require("../model/project.model");
const ProjectFile = require("../model/project-files.model");
const { Sequelize } = require('sequelize');
const sequelize = require('../config/sequelize');
const path = require("path");


class ProjectService {
  async createProject(userId, projectData, files) {
    const project = await Project.create({
      ...projectData,
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
    // Start a transaction
    const transaction = await sequelize.transaction();
  
    try {
      // Find the project
      const project = await Project.findByPk(projectId, {
        include: [{ model: ProjectFile, as: 'files' }],
        transaction
      });
  
      // Authorization check
      if (!project || (userRole !== 'super_admin' && project.userId !== userId)) {
        throw new Error('Unauthorized project deletion');
      }
  
      // Delete associated files first
      await ProjectFile.destroy({
        where: { projectId: project.id },
        transaction
      });
  
      // Then delete the project
      await project.destroy({ transaction });
  
      // Commit the transaction
      await transaction.commit();
  
      return project;
    } catch (error) {
      
      await transaction.rollback();
      throw error;
    }
  }



}

module.exports = new ProjectService();
