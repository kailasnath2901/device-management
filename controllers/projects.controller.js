const ProjectService = require("../services/project.services");
const path = require("path");
const fs = require("fs");
const ProjectFile = require("../model/project-files.model");
const Project = require("../model/project.model");
const UserProjectAcquisition = require("../model/user-project-acquisition.model");
const mime = require("mime-types");
const FileDownloadLog = require("../model/filedownloadlog");

class ProjectController {

  async createProject(req, res) {
    try {
      const userId = req.user.id;  // Assuming you get userId from authenticated user
      
      // Make sure name exists in the request body
      if (!req.body.name) {
        return res.status(400).json({ error: "Project name is required" });
      }
      
      const projectData = {
        name: req.body.name,
        description: req.body.description,
        youtubeLink: req.body.youtubeLink,
        projectType: req.body.projectType || "free",
        maxAcquisitions: req.body.maxAcquisitions || 5,
        lastUpdated: new Date()
      };
      
      // Handle image file
      if (req.files && req.files.image && req.files.image[0]) {
        projectData.imageUrl = `/images/projects/${req.files.image[0].filename}`;
      }
      
      const project = await Project.create({
        ...projectData,
        version: 1,
        userId,
      });
      
      if (req.files && req.files.length > 0) {
        const projectFiles = req.files.map((file) => {
          // Check if this is an extracted zip file
          if (file.isExtracted && file.extractPath) {
            return {
              projectId: project.id,
              filename: path.basename(file.originalname, '.zip'), // Use zip name without extension
              fileType: 'directory', // Mark as directory
              fileSize: file.size,
              filePath: file.extractPath, // Use the extraction path
              mimetype: 'application/directory',
              // Use correct casing to match the column names defined in your model
              isZipExtracted: true,
              originalZipName: file.originalname
            };
          } else {
            // Regular file
            return {
              projectId: project.id,
              filename: file.filename,
              fileType: path.extname(file.originalname),
              fileSize: file.size,
              filePath: file.path,
              mimetype: file.mimetype,
              // Include these fields for all files, but set to default values for non-zip files
              isZipExtracted: false,
              originalZipName: null
            };
          }
        });
    
        await ProjectFile.bulkCreate(projectFiles);
      }
      
      return res.status(201).json({ 
        success: true, 
        message: "Project created successfully", 
        project 
      });
    } catch (error) {
      console.error("Error creating project:", error);
      return res.status(500).json({ error: error.message });
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
      if (req.user.role !== "admin" && req.user.role !== "super_admin") {
        return res.status(403).json({
          success: false,
          message: "Unauthorized. Only admins can delete projects.",
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
        include: [
          {
            model: Project,
            as: "project",
            attributes: ["id", "userId"],
          },
        ],
      });

      // Check file existence
      if (!file) {
        return res.status(404).json({
          success: false,
          message: "File not found",
        });
      }

      // Check if user is authenticated
      // Any logged-in user can download
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      // Check physical file existence
      if (!fs.existsSync(file.filePath)) {
        return res.status(404).json({
          success: false,
          message: "File does not exist on server",
        });
      }

      // Set download headers
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${file.filename}"`
      );
      res.setHeader(
        "Content-Type",
        file.mimetype || "application/octet-stream"
      );

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
      console.error("Download error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error during file download",
        errorDetails: error.message,
      });
    }
  }

  async acquireProject(req, res) {
    try {
      const { projectId } = req.params;
      const { deviceId } = req.body;
      const userId = req.user.id;
  
      // Validation
      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: "Project ID is required"
        });
      }
  
      if (!deviceId) {
        return res.status(400).json({
          success: false,
          message: "Device ID is required"
        });
      }
  
      // Call service method
      const result = await ProjectService.acquireProject(
        userId,
        parseInt(projectId),
        parseInt(deviceId)
      );
  
      return res.status(200).json({
        success: true,
        message: "Project acquired successfully for the device",
        acquisition: result.acquisition,
        firmwareVersion: result.firmwareVersion
      });
    } catch (error) {
      console.error("Acquire Project Error:", error);
      return res.status(error.status || 500).json({
        success: false,
        message: error.message || "Error acquiring project"
      });
    }
  }

  async getAcquiredProjects(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10, deviceId } = req.query;

      const result = await ProjectService.getAcquiredProjects(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        deviceId: deviceId ? parseInt(deviceId) : null // Allow filtering by device
      });

      res.json({
        success: true,
        projects: result.projects,
        totalAcquiredProjects: result.totalProjectsAcquired,
        currentPage: result.currentPage,
        totalPages: result.totalPages
      });
    } catch (error) {
      console.error("Get Acquired Projects Error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async removeAcquiredProject(req, res) {
    try {
      const { projectId } = req.params;
      const { deviceId } = req.body; // Get deviceId from the request

      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      if (!deviceId) {
        return res.status(400).json({
          success: false,
          message: "Device ID is required",
        });
      }

      const result = await ProjectService.removeAcquiredProject(
        req.user.id,
        projectId,
        deviceId
      );

      res.json({
        success: true,
        message: "Project removed successfully from the device",
        firmwareVersion: result.currentFirmwareVersion,
        remainingProjects: result.remainingProjects,
      });
    } catch (error) {
      console.error("Remove Project Error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  
  async getUserDevices(req, res) {
    try {
      const userId = req.user.id;
      
      const devices = await ProjectService.getUserDevices(userId);
      
      res.json({
        success: true,
        devices: devices
      });
    } catch (error) {
      console.error("Get User Devices Error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = new ProjectController();
