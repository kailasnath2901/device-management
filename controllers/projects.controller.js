const ProjectService = require("../services/project.services");
const path = require("path");
const fs = require("fs");
const ProjectFile = require("../model/project-files.model");
const Project = require("../model/project.model");
const UserProjectAcquisition = require("../model/user-project-acquisition.model");
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
      
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }
  
      const result = await ProjectService.acquireProject(req.user.id, projectId);
  
      res.json({
        success: true,
        message: 'Project acquired successfully',
        firmwareVersion: result.firmwareVersion
      });
    } catch (error) {
      console.error('Acquire Project Error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }


  async getAcquiredProjects(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10 } = req.query;
  
      const result = await ProjectService.getAcquiredProjects(userId, {
        page: parseInt(page),
        limit: parseInt(limit)
      });
  
      res.json({
        success: true,
        currentFirmwareVersion: result.currentFirmwareVersion, // Include the shared version
        projects: result.projects,
        totalAcquiredProjects: result.totalProjectsAcquired
      });
    } catch (error) {
      console.error('Get Acquired Projects Error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  
  async removeAcquiredProject(req, res) {
    try {
      const { projectId } = req.params;
      
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      const result = await ProjectService.removeAcquiredProject(req.user.id, projectId);

      res.json({
        success: true,
        message: 'Project removed successfully',
        firmwareVersion: result.currentFirmwareVersion,
        remainingProjects: result.remainingProjects
      });
      
    } catch (error) {
      console.error('Remove Project Error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  


}

module.exports = new ProjectController();
