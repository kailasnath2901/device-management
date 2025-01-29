const ProjectService = require("../services/project.services");
const path = require("path");
const fs = require("fs");
const ProjectFile = require("../model/project-files.model");
const Project = require("../model/project.model");
const UserProjectAcquisition = require("../model/user-project-acquisition.model")
const mime = require("mime-types");
const FileDownloadLog = require('../model/filedownloadlog');

class ProjectController {
  async createProject(req, res) {
    try {
      const { name, description, youtubeLink } = req.body;
      const files = req.files;

      if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized. Only admins can delete projects.'
        });
      }

      const project = await ProjectService.createProject(
        req.user.id,
        { name, description, youtubeLink },
        files
      );

      res.status(201).json({
        success: true,
        message: "Project created successfully",
        project,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getUserProjects(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const { page = 1, limit = 10 } = req.query;
  
      const projects = await ProjectService.getUserProjects(userId, userRole, {
        page: parseInt(page),
        limit: parseInt(limit),
      });
  
      res.json({
        success: true,
        ...projects,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async deleteProject(req, res) {
    try {
      const { projectId } = req.params;
      
      // Check if user is admin or super_admin
      if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized. Only admins can delete projects.'
        });
      }
  
      const result = await ProjectService.deleteProject(
        projectId,
        req.user.id,
        req.user.role
      );
      
      res.json({
        success: true,
        message: "Project deleted successfully",
        result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async downloadProjectFile(req, res) {
    try {
      const { fileId } = req.params;
  
      // Fetch file with full project details
      const file = await ProjectFile.findByPk(fileId, {
        include: [{
          model: Project,
          as: 'project',
          attributes: ['id', 'userId']
        }]
      });
  
      // Check file existence
      if (!file) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }
  
      // Check if user is authenticated
      // Any logged-in user can download
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
  
      // Check physical file existence
      if (!fs.existsSync(file.filePath)) {
        return res.status(404).json({
          success: false,
          message: 'File does not exist on server'
        });
      }
  
      // Set download headers
      res.setHeader(
        'Content-Disposition', 
        `attachment; filename="${file.filename}"`
      );
      res.setHeader('Content-Type', file.mimetype || 'application/octet-stream');
  
      // Stream the file
      const fileStream = fs.createReadStream(file.filePath);
      fileStream.pipe(res);
  
    //   // Optional: Log download activity
    //   await FileDownloadLog.create({
    //     userId: req.user.id,
    //     fileId: file.id,
    //     downloadedAt: new Date()
    //   });
  
    } catch (error) {
      console.error('Download error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during file download',
        errorDetails: error.message
      });
    }
  }


  async acquireProject(req, res) {
    try {
      const { projectId } = req.params;
      
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }
  
      const userId = req.user.id;
  
      // Check if project exists
      const project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
  
      // Check user's current project acquisitions
      const currentAcquisitions = await UserProjectAcquisition.count({
        where: { userId }
      });
  
      // Check if user has reached max acquisitions
      if (currentAcquisitions >= 4) {
        return res.status(400).json({
          success: false,
          message: 'Maximum project acquisitions reached. Delete a project first.'
        });
      }
  
      // Create project acquisition
      await UserProjectAcquisition.create({ userId, projectId });
  
      res.json({
        success: true,
        message: 'Project acquired successfully'
      });
    } catch (error) {
      console.error('Acquire Project Error:', error); // Log the error for debugging
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errorDetails: error.message // Optionally include details for debugging
      });
    }
  }
  
  
  async removeAcquiredProject(req, res) {
    try {
      const { projectId } = req.params;
      const userId = req.user.id;
  
      // Remove project acquisition
      const result = await UserProjectAcquisition.destroy({
        where: { 
          userId, 
          projectId 
        }
      });
  
      if (result === 0) {
        return res.status(404).json({
          success: false,
          message: 'Project acquisition not found'
        });
      }
  
      res.json({
        success: true,
        message: 'Project removed from acquisitions'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getAcquiredProjects(req, res) {
    try {
      const userId = req.user.id;
  
      const acquiredProjects = await UserProjectAcquisition.findAll({
        where: { userId },
        include: [{
          model: Project,
          as: 'acquiredBy', // Use the correct alias here
          attributes: ['id', 'name', 'description', 'projectType', 'youtubeLink'],
          include: [{
            model: ProjectFile,
            as: 'files',
            attributes: ['id', 'filename', 'fileType', 'fileSize']
          }]
        }]
      });
  
      res.json({
        success: true,
        projects: acquiredProjects.map(acquisition => ({
          ...acquisition.acquiredBy.toJSON(), // Use the correct reference here
          acquiredAt: acquisition.createdAt
        })),
        totalAcquiredProjects: acquiredProjects.length
      });
    } catch (error) {
      console.error('Get Acquired Projects Error:', error); // Log for debugging
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  


}

module.exports = new ProjectController();
