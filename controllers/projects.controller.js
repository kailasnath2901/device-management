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
      const userId = req.user.id;

      if (!req.body.name) {
        return res.status(400).json({ error: "Project name is required" });
      }

      const projectData = {
        name: req.body.name,
        description: req.body.description,
        youtubeLink: req.body.youtubeLink,
        projectType: req.body.projectType || "free",
        maxAcquisitions: req.body.maxAcquisitions || 5,
        lastUpdated: new Date(),
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

      // Process ALL files (excluding image field)
      let allFiles = [];

      if (req.files) {
        // Get all files except image files
        Object.keys(req.files).forEach((fieldName) => {
          if (fieldName !== "image") {
            // Skip image field as it's handled separately
            allFiles = allFiles.concat(req.files[fieldName]);
          }
        });

        // Also handle if files are directly in req.files array (not organized by field)
        if (Array.isArray(req.files)) {
          allFiles = allFiles.concat(
            req.files.filter(
              (file) => !file.fieldname || file.fieldname !== "image"
            )
          );
        }
      }

      console.log("Files to process:", allFiles.length); // Debug log

      if (allFiles.length > 0) {
        const projectFilesData = allFiles.map((file) => {
          console.log("Processing file:", file.originalname, file.isExtracted); // Debug log

          if (file.isExtracted && file.extractPath) {
            return {
              projectId: project.id,
              filename: path.basename(file.originalname, ".zip"),
              fileType: "directory",
              fileSize: file.size,
              filePath: file.extractPath,
              mimetype: "application/directory",
              isZipExtracted: true,
              originalZipName: file.originalname,
            };
          } else {
            return {
              projectId: project.id,
              filename: file.filename || file.originalname,
              fileType: path.extname(file.originalname),
              fileSize: file.size,
              filePath: file.path,
              mimetype: file.mimetype,
              isZipExtracted: false,
              originalZipName: null,
            };
          }
        });

        await ProjectFile.bulkCreate(projectFilesData);
        console.log("Created project files:", projectFilesData.length); // Debug log
      }

      // Fetch the complete project with files (like in ProjectService)
      const completeProject = await Project.findByPk(project.id, {
        include: [
          {
            model: ProjectFile,
            as: "files", // Make sure this matches your association alias
          },
        ],
      });

      return res.status(201).json({
        success: true,
        message: "Project created successfully",
        project: completeProject, // Return complete project with files
      });
    } catch (error) {
      console.error("Error creating project:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  async editProject(req, res) {
    try {
      const { projectId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      // Find existing project
      const existingProject = await Project.findByPk(projectId, {
        include: [
          {
            model: ProjectFile,
            as: "files",
          },
        ],
      });

      if (!existingProject) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }

      // Authorization check
      if (userRole !== "admin" && userRole !== "super_admin" && existingProject.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized. You can only edit your own projects or be an admin.",
        });
      }

      // Prepare update data
      const updateData = {};
      if (req.body.name) updateData.name = req.body.name;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.youtubeLink !== undefined) updateData.youtubeLink = req.body.youtubeLink;
      if (req.body.projectType) updateData.projectType = req.body.projectType;
      if (req.body.maxAcquisitions) updateData.maxAcquisitions = req.body.maxAcquisitions;
      updateData.lastUpdated = new Date();

      // Handle image update
      if (req.files && req.files.image && req.files.image[0]) {
        // Delete old image if exists
        if (existingProject.imageUrl) {
          const oldImagePath = path.join(process.cwd(), 'public', existingProject.imageUrl);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
        updateData.imageUrl = `/images/projects/${req.files.image[0].filename}`;
      }

      // Update project basic info
      await existingProject.update(updateData);

      // Handle files update
      let filesToDelete = [];
      let newFiles = [];

      // Parse files to delete (sent as JSON string in body)
      if (req.body.filesToDelete) {
        try {
          filesToDelete = JSON.parse(req.body.filesToDelete);
        } catch (e) {
          console.error("Error parsing filesToDelete:", e);
        }
      }

      // Delete specified files
      if (filesToDelete.length > 0) {
        for (const fileId of filesToDelete) {
          const fileToDelete = await ProjectFile.findByPk(fileId);
          if (fileToDelete && fileToDelete.projectId === existingProject.id) {
            // Delete physical file/directory
            if (fs.existsSync(fileToDelete.filePath)) {
              if (fileToDelete.isZipExtracted) {
                // Delete directory recursively
                fs.rmSync(fileToDelete.filePath, { recursive: true, force: true });
              } else {
                // Delete single file
                fs.unlinkSync(fileToDelete.filePath);
              }
            }
            // Delete from database
            await fileToDelete.destroy();
          }
        }
      }

      // Process new files (excluding image field)
      if (req.files) {
        Object.keys(req.files).forEach((fieldName) => {
          if (fieldName !== "image") {
            newFiles = newFiles.concat(req.files[fieldName]);
          }
        });

        if (Array.isArray(req.files)) {
          newFiles = newFiles.concat(
            req.files.filter(
              (file) => !file.fieldname || file.fieldname !== "image"
            )
          );
        }
      }

      // Add new files to database
      if (newFiles.length > 0) {
        const projectFilesData = newFiles.map((file) => {
          if (file.isExtracted && file.extractPath) {
            return {
              projectId: existingProject.id,
              filename: path.basename(file.originalname, ".zip"),
              fileType: "directory",
              fileSize: file.size,
              filePath: file.extractPath,
              mimetype: "application/directory",
              isZipExtracted: true,
              originalZipName: file.originalname,
            };
          } else {
            return {
              projectId: existingProject.id,
              filename: file.filename || file.originalname,
              fileType: path.extname(file.originalname),
              fileSize: file.size,
              filePath: file.path,
              mimetype: file.mimetype,
              isZipExtracted: false,
              originalZipName: null,
            };
          }
        });

        await ProjectFile.bulkCreate(projectFilesData);
      }

      // Fetch updated project with files
      const updatedProject = await Project.findByPk(projectId, {
        include: [
          {
            model: ProjectFile,
            as: "files",
          },
        ],
      });

      return res.status(200).json({
        success: true,
        message: "Project updated successfully",
        project: updatedProject,
      });
    } catch (error) {
      console.error("Error updating project:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

 // NEW: Get single project for editing
  async getProject(req, res) {
    try {
      const { projectId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const project = await Project.findByPk(projectId, {
        include: [
          {
            model: ProjectFile,
            as: "files",
          },
        ],
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }

      // Authorization check for viewing
      if (userRole !== "admin" && userRole !== "super_admin" && project.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to view this project",
        });
      }

      return res.status(200).json({
        success: true,
        project: project,
      });
    } catch (error) {
      console.error("Error fetching project:", error);
      return res.status(500).json({
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
          message: "Project ID is required",
        });
      }

      if (!deviceId) {
        return res.status(400).json({
          success: false,
          message: "Device ID is required",
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
        firmwareVersion: result.firmwareVersion,
        projectInfo: {
          currentProjects: result.projectsCount,
          maxProjects: result.maxProjects,
          remainingSlots: result.maxProjects - result.projectsCount,
        },
      });
    } catch (error) {
      console.error("Acquire Project Error:", error);
      return res.status(error.status || 500).json({
        success: false,
        message: error.message || "Error acquiring project",
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
        deviceId: deviceId ? parseInt(deviceId) : null, // Allow filtering by device
      });

      res.json({
        success: true,
        projects: result.projects,
        totalAcquiredProjects: result.totalProjectsAcquired,
        currentPage: result.currentPage,
        totalPages: result.totalPages,
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
        devices: devices,
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
