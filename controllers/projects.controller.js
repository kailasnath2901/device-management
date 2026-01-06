const ProjectService = require("../services/project.services");
const path = require("path");
const fs = require("fs");
const ProjectFile = require("../model/project-files.model");
const Project = require("../model/project.model");
const UserProjectAcquisition = require("../model/user-project-acquisition.model");
const mime = require("mime-types");
const ProjectImage = require("../model/projectImage.model");
const Category = require("../model/category.model");
const ProjectComponent = require("../model/projectComponent.model");
const Component = require("../model/component.model");

class ProjectController {
  async createCategory(req, res) {
    try {
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Category name is required",
        });
      }

      const category = await ProjectService.createCategory({
        name,
        description,
      });

      return res.status(201).json({
        success: true,
        message: "Category created successfully",
        category,
      });
    } catch (error) {
      console.error("Error creating category:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getCategories(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const result = await ProjectService.getCategories({ page, limit });

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error("Error fetching categories:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getCategoryById(req, res) {
    try {
      const { id } = req.params;
      const category = await ProjectService.getCategoryById(id);

      return res.status(200).json({
        success: true,
        category,
      });
    } catch (error) {
      console.error("Error fetching category:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const category = await ProjectService.updateCategory(id, updateData);

      return res.status(200).json({
        success: true,
        message: "Category updated successfully",
        category,
      });
    } catch (error) {
      console.error("Error updating category:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async deleteCategory(req, res) {
    try {
      const { id } = req.params;
      const result = await ProjectService.deleteCategory(id);

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error("Error deleting category:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Component CRUD operations
  async createComponent(req, res) {
    try {
      const { name, description, specifications } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Component name is required",
        });
      }

      const component = await ProjectService.createComponent({
        name,
        description,
        specifications,
      });

      return res.status(201).json({
        success: true,
        message: "Component created successfully",
        component,
      });
    } catch (error) {
      console.error("Error creating component:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getComponents(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const result = await ProjectService.getComponents({ page, limit });

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error("Error fetching components:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getComponentById(req, res) {
    try {
      const { id } = req.params;
      const component = await ProjectService.getComponentById(id);

      return res.status(200).json({
        success: true,
        component,
      });
    } catch (error) {
      console.error("Error fetching component:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async updateComponent(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const component = await ProjectService.updateComponent(id, updateData);

      return res.status(200).json({
        success: true,
        message: "Component updated successfully",
        component,
      });
    } catch (error) {
      console.error("Error updating component:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async deleteComponent(req, res) {
    try {
      const { id } = req.params;
      const result = await ProjectService.deleteComponent(id);

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error("Error deleting component:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Search categories by name
  async searchCategories(req, res) {
    try {
      const { search, page = 1, limit = 10 } = req.query;

      if (!search || search.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Search term is required",
        });
      }

      const result = await ProjectService.searchCategories(search.trim(), {
        page: parseInt(page),
        limit: parseInt(limit),
      });

      return res.status(200).json({
        success: true,
        searchTerm: search.trim(),
        ...result,
      });
    } catch (error) {
      console.error("Error searching categories:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Search components by name
  async searchComponents(req, res) {
    try {
      const { search, page = 1, limit = 10 } = req.query;

      if (!search || search.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Search term is required",
        });
      }

      const result = await ProjectService.searchComponents(search.trim(), {
        page: parseInt(page),
        limit: parseInt(limit),
      });

      return res.status(200).json({
        success: true,
        searchTerm: search.trim(),
        ...result,
      });
    } catch (error) {
      console.error("Error searching components:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Project operations
  // Project operations
  async createProject(req, res) {
    try {
      const userId = req.user.id;

      // Validate required fields
      if (!req.body.name) {
        return res.status(400).json({
          success: false,
          message: "Project name is required",
        });
      }

      if (!req.body.keywords) {
        return res.status(400).json({
          success: false,
          message: "Keywords are required",
        });
      }

      if (!req.body.categoryId) {
        return res.status(400).json({
          success: false,
          message: "Category is required",
        });
      }

      // Validate required fields for new schema
      if (!req.body.whatItIs) {
        return res.status(400).json({
          success: false,
          message: "whatItIs field is required",
        });
      }

      if (req.body.projectId) {
        const existingProject = await Project.findOne({
          where: { projectId: req.body.projectId },
        });

        if (existingProject) {
          return res.status(400).json({
            success: false,
            message: `Project ID '${req.body.projectId}' already exists. Please choose a different one.`,
          });
        }
      }

      if (!req.body.howItWorks) {
        return res.status(400).json({
          success: false,
          message: "howItWorks field is required",
        });
      }

      // Parse and validate keywords - convert string to array
      let keywordsList = [];
      if (req.body.keywords) {
        try {
          // If keywords is a string, split it by comma and clean up
          if (typeof req.body.keywords === "string") {
            keywordsList = req.body.keywords
              .split(",")
              .map((keyword) => keyword.trim())
              .filter((keyword) => keyword.length > 0);
          } else if (Array.isArray(req.body.keywords)) {
            keywordsList = req.body.keywords;
          } else {
            throw new Error("Invalid keywords format");
          }
        } catch (e) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid keywords format. Please provide comma-separated keywords or an array.",
          });
        }
      }

      if (keywordsList.length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one keyword is required",
        });
      }

      // Parse required components if provided
      let requiredComponents = [];
      if (req.body.requiredComponents) {
        try {
          requiredComponents = JSON.parse(req.body.requiredComponents);
        } catch (e) {
          return res.status(400).json({
            success: false,
            message: "Invalid required components format",
          });
        }
      }

      if (req.body.dashboard) {
        try {
          JSON.parse(req.body.dashboard); // just to validate
        } catch (e) {
          return res.status(400).json({
            success: false,
            message: "Invalid dashboard JSON format.",
          });
        }
      }

      const projectData = {
        name: req.body.name,
        description: req.body.description,
        keywordsList: keywordsList,
        whatItIs: req.body.whatItIs,
        howItWorks: req.body.howItWorks,
        priceInInr: req.body.priceInInr || null,
        difficulty: req.body.difficulty || "easy",
        categoryId: req.body.categoryId,
        testAndTroubleshootLink: req.body.testLink || req.body.troubleshootLink,
        versionType: req.body.version_type
          ? req.body.version_type
          : req.body.versionType || "development",
        youtubeLink: req.body.youtubeLink,
        projectType: req.body.projectType || "free",
        maxAcquisitions: req.body.maxAcquisitions || 5,
        lastUpdated: new Date(),
        version: 1,
        userId,
        dashboard: req.body.dashboard || null,
        // Custom projectId - if provided, use it; otherwise, it will be auto-generated
        projectId: req.body.projectId || undefined,
      };

      // Create project
      const project = await Project.create(projectData);

      // Create project folder using the primary key id (not custom projectId)
      const projectFolder = path.join(
        process.cwd(),
        "public",
        "projects",
        project.id.toString()
      );
      if (!fs.existsSync(projectFolder)) {
        fs.mkdirSync(projectFolder, { recursive: true });
      }

      // Handle multiple images
      if (req.files && req.files.images) {
        const imageFolder = path.join(projectFolder, "images");
        if (!fs.existsSync(imageFolder)) {
          fs.mkdirSync(imageFolder, { recursive: true });
        }

        const imagePromises = req.files.images.map(async (imageFile) => {
          const imagePath = path.join(imageFolder, imageFile.filename);
          // Move file to project folder
          fs.renameSync(imageFile.path, imagePath);

          return ProjectImage.create({
            projectId: project.id,
            filename: imageFile.filename,
            originalName: imageFile.originalname,
            filePath: imagePath,
            publicUrl: `/projects/${project.id}/images/${imageFile.filename}`,
            fileSize: imageFile.size,
            mimetype: imageFile.mimetype,
          });
        });

        await Promise.all(imagePromises);
      }

      // Handle project files
      if (req.files && req.files.files) {
        const invalidFiles = req.files.files.filter(
          (file) => !file.originalname
        );
        if (invalidFiles.length > 0) {
          return res.status(400).json({
            success: false,
            message: "Some files are missing original names",
          });
        }

        const filesPromises = req.files.files.map(async (file) => {
          const filePath = path.join(projectFolder, file.filename);
          // Move file to project folder
          fs.renameSync(file.path, filePath);

          return ProjectFile.create({
            projectId: project.id,

            filename: file.filename,
            originalName: file.originalname,
            fileType: path.extname(file.originalname),
            fileSize: file.size,
            filePath: filePath,
            mimetype: file.mimetype,
            isZipExtracted: false,
            originalZipName: null,
          });
        });

        await Promise.all(filesPromises);
      }

      // Handle required components
      if (requiredComponents.length > 0) {
        const componentPromises = requiredComponents.map((componentId) =>
          ProjectComponent.create({
            projectId: project.id,
            componentId: componentId,
          })
        );
        await Promise.all(componentPromises);
      }

      // Fetch complete project with all associations
      const completeProject = await Project.findByPk(project.id, {
        include: [
          {
            model: ProjectFile,
            as: "files",
          },
          {
            model: ProjectImage,
            as: "images",
          },
          {
            model: Category,
            as: "category",
          },
          {
            model: Component,
            as: "components",
            through: { attributes: [] },
          },
        ],
      });

      return res.status(201).json({
        success: true,
        message: "Project created successfully",
        project: completeProject,
      });
    } catch (error) {
      console.error("Error creating project:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async editProject(req, res) {
    try {
      const { projectId } = req.params; // This is the primary key id
      const userId = req.user.id;
      const userRole = req.user.role;

      // Find existing project by primary key
      const existingProject = await Project.findByPk(projectId, {
        include: [
          {
            model: ProjectFile,
            as: "files",
          },
          {
            model: ProjectImage,
            as: "images",
          },
          {
            model: Category,
            as: "category",
          },
          {
            model: Component,
            as: "components",
            through: { attributes: [] },
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
      if (
        userRole !== "admin" &&
        userRole !== "super_admin" &&
        existingProject.userId !== userId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Unauthorized. You can only edit your own projects or be an admin.",
        });
      }

      // Prepare update data
      const updateData = {
        lastUpdated: new Date(),
      };

      // Update fields if provided
      if (req.body.name) updateData.name = req.body.name;
      if (req.body.description !== undefined)
        updateData.description = req.body.description;
      if (req.body.keywords !== undefined) {
        // Handle keywords update
        let keywordsList = [];
        if (typeof req.body.keywords === "string") {
          keywordsList = req.body.keywords
            .split(",")
            .map((keyword) => keyword.trim())
            .filter((keyword) => keyword.length > 0);
        } else if (Array.isArray(req.body.keywords)) {
          keywordsList = req.body.keywords;
        }
        updateData.keywordsList = keywordsList;
      }
      if (req.body.whatItIs !== undefined)
        updateData.whatItIs = req.body.whatItIs;
      if (req.body.howItWorks !== undefined)
        updateData.howItWorks = req.body.howItWorks;
      if (req.body.priceInInr !== undefined)
        updateData.priceInInr = req.body.priceInInr;
      if (req.body.difficulty !== undefined)
        updateData.difficulty = req.body.difficulty;
      if (req.body.categoryId !== undefined)
        updateData.categoryId = req.body.categoryId;
      if (req.body.testLink !== undefined)
        updateData.testAndTroubleshootLink = req.body.testLink;
      if (req.body.troubleshootLink !== undefined)
        updateData.testAndTroubleshootLink = req.body.troubleshootLink;
      if (req.body.versionType !== undefined)
        updateData.versionType = req.body.versionType;
      if (req.body.youtubeLink !== undefined)
        updateData.youtubeLink = req.body.youtubeLink;
      if (req.body.projectType !== undefined)
        updateData.projectType = req.body.projectType;
      if (req.body.maxAcquisitions !== undefined)
        updateData.maxAcquisitions = req.body.maxAcquisitions;
      if (req.body.dashboard !== undefined)
        updateData.dashboard = req.body.dashboard;

      // Update project basic info
      await existingProject.update(updateData);

      const projectFolder = path.join(
        process.cwd(),
        "public",
        "projects",
        projectId.toString()
      );

      // Handle image updates
      let imagesToDelete = [];
      if (req.body.imagesToDelete) {
        try {
          imagesToDelete = JSON.parse(req.body.imagesToDelete);
        } catch (e) {
          console.error("Error parsing imagesToDelete:", e);
        }
      }

      // Delete specified images
      if (imagesToDelete.length > 0) {
        for (const imageId of imagesToDelete) {
          const imageToDelete = await ProjectImage.findByPk(imageId);
          if (imageToDelete && imageToDelete.projectId === existingProject.id) {
            // Delete physical file
            if (fs.existsSync(imageToDelete.filePath)) {
              fs.unlinkSync(imageToDelete.filePath);
            }
            // Delete from database
            await imageToDelete.destroy();
          }
        }
      }

      // Handle new images
      if (req.files && req.files.images) {
        const imageFolder = path.join(projectFolder, "images");
        if (!fs.existsSync(imageFolder)) {
          fs.mkdirSync(imageFolder, { recursive: true });
        }

        const imagePromises = req.files.images.map(async (imageFile) => {
          const imagePath = path.join(imageFolder, imageFile.filename);
          fs.renameSync(imageFile.path, imagePath);

          return ProjectImage.create({
            projectId: existingProject.id,
            filename: imageFile.filename,
            originalName: imageFile.originalname,
            filePath: imagePath,
            publicUrl: `/projects/${existingProject.id}/images/${imageFile.filename}`,
            fileSize: imageFile.size,
            mimetype: imageFile.mimetype,
          });
        });

        await Promise.all(imagePromises);
      }

      // Handle files update
      let filesToDelete = [];
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
            // Delete physical file
            if (fs.existsSync(fileToDelete.filePath)) {
              fs.unlinkSync(fileToDelete.filePath);
            }
            // Delete from database
            await fileToDelete.destroy();
          }
        }
      }

      // Handle new files
      if (req.files && req.files.files) {
        const filesPromises = req.files.files.map(async (file) => {
          const filePath = path.join(projectFolder, file.filename);
          fs.renameSync(file.path, filePath);

          return ProjectFile.create({
            projectId: existingProject.id,
            filename: file.filename,
            originalName: file.originalname,
            fileType: path.extname(file.originalname),
            fileSize: file.size,
            filePath: filePath,
            mimetype: file.mimetype,
            isZipExtracted: false,
            originalZipName: null,
          });
        });

        await Promise.all(filesPromises);
      }

      // Handle required components update
      if (req.body.requiredComponents) {
        try {
          const requiredComponents = JSON.parse(req.body.requiredComponents);

          // Remove existing components
          await ProjectComponent.destroy({
            where: { projectId: existingProject.id },
          });

          // Add new components
          if (requiredComponents.length > 0) {
            const componentPromises = requiredComponents.map((componentId) =>
              ProjectComponent.create({
                projectId: existingProject.id,
                componentId: componentId,
              })
            );
            await Promise.all(componentPromises);
          }
        } catch (e) {
          console.error("Error updating required components:", e);
        }
      }

      // Fetch updated project with all associations
      const updatedProject = await Project.findByPk(projectId, {
        include: [
          {
            model: ProjectFile,
            as: "files",
          },
          {
            model: ProjectImage,
            as: "images",
          },
          {
            model: Category,
            as: "category",
          },
          {
            model: Component,
            as: "components",
            through: { attributes: [] },
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
          {
            model: ProjectImage,
            as: "images",
          },
          {
            model: Category,
            as: "category",
          },
          {
            model: Component,
            as: "components",
            through: { attributes: [] },
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
      if (
        userRole !== "admin" &&
        userRole !== "super_admin" &&
        project.userId !== userId
      ) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to view this project",
        });
      }

      // Transform project data to add publicUrl to images
      const projectData = project.toJSON();

      // Get base URL from environment or use default
      const baseUrl = process.env.BASE_URL || "https://dev.roboninjaz.com";

      // Add publicUrl to each image
      if (projectData.images && projectData.images.length > 0) {
        projectData.images = projectData.images.map((image) => ({
          ...image,
          publicUrl: `${baseUrl}/projects/${projectId}/images/${image.filename}`,
        }));
      }

      // Optionally add publicUrl to files as well
      if (projectData.files && projectData.files.length > 0) {
        projectData.files = projectData.files.map((file) => ({
          ...file,
          publicUrl: `${baseUrl}/projects/${projectId}/files/${file.filename}`,
        }));
      }

      return res.status(200).json({
        success: true,
        project: projectData,
      });
    } catch (error) {
      console.error("Error fetching project:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getProjectByProjectId(req, res) {
    try {
      const { projectId } = req.params;
      const userRole = req.user.role;

      const project = await ProjectService.getProjectByProjectId(
        projectId,
        userRole
      );

      if (!project) {
        return res.status(404).json({
          success: false,
          message: `Project with ID '${projectId}' not found`,
        });
      }

      return res.status(200).json({
        success: true,
        project: project,
      });
    } catch (error) {
      console.error("Error fetching project by projectId:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async searchProjects(req, res) {
    console.log("Search query parameters:", req.query);
    console.log("Request path:", req.path);
    try {
      const {
        keyword,
        componentId,
        projectName,
        projectId, // This receives 'projectId' from query
        project_id, // This receives 'project_id' from query
        categoryId,
        difficulty,
        projectType,
        page = 1,
        limit = 10,
      } = req.query;

      // Handle both parameter names - use whichever is provided
      const actualProjectId = projectId || project_id;

      const userRole = req.user.role;

      // Use the service layer
      const result = await ProjectService.searchProjects(
        {
          keyword,
          componentId,
          projectName,
          projectId: actualProjectId, // Pass the actual project ID
          categoryId,
          difficulty,
          projectType,
        },
        { page, limit },
        userRole
      );

      return res.status(200).json({
        success: true,
        projects: result.projects,
        pagination: {
          currentPage: result.currentPage,
          totalPages: result.totalPages,
          totalProjects: result.totalProjects,
          limit: parseInt(limit),
        },
      });
    } catch (error) {
      console.error("Error searching projects:", error);
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

      // Find the project first
      const project = await Project.findByPk(projectId, {
        include: [
          {
            model: ProjectFile,
            as: "files",
          },
          {
            model: ProjectImage,
            as: "images",
          },
        ],
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }

      // Delete project folder and all its contents
      const projectFolder = path.join(
        process.cwd(),
        "public",
        "projects",
        projectId.toString()
      );
      if (fs.existsSync(projectFolder)) {
        fs.rmSync(projectFolder, { recursive: true, force: true });
      }

      // Delete from database (this will cascade to related tables)
      const result = await ProjectService.deleteProject(
        projectId,
        req.user.id,
        req.user.role
      );

      res.json({
        success: true,
        message: "Project and all associated files deleted successfully",
        result,
      });
    } catch (error) {
      console.error("Error deleting project:", error);
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

      // Optional: Log download activity
      // await FileDownloadLog.create({
      //   userId: req.user.id,
      //   fileId: file.id,
      //   downloadedAt: new Date()
      // });
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
      isRunning: result.isRunning,
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


async setRunningProject(req, res) {
  try {
    const { projectId, deviceId } = req.body;
    const userId = req.user.id;

    if (!projectId || !deviceId) {
      return res.status(400).json({
        success: false,
        message: "Project ID and Device ID are required",
      });
    }

    // Parse deviceId only if it's a number, otherwise keep as string (serial number)
    const parsedDeviceId = isNaN(deviceId) ? deviceId : parseInt(deviceId);

    const result = await ProjectService.setRunningProject(
      userId,
      projectId,
      parsedDeviceId
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error("Set Running Project Error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Error setting running project",
    });
  }
}

async getRunningProject(req, res) {
  try {
    const { deviceId } = req.query;
    const userId = req.user.id;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: "Device ID is required",
      });
    }

    // Parse deviceId only if it's a number, otherwise keep as string (serial number)
    const parsedDeviceId = isNaN(deviceId) ? deviceId : parseInt(deviceId);

    const result = await ProjectService.getRunningProjectForDevice(
      parsedDeviceId,
      userId
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error("Get Running Project Error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Error fetching running project",
    });
  }
}


 async getAcquiredProjects(req, res) {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, deviceId, serialNumber } = req.query;

    // Validate deviceId if provided
    if (deviceId && isNaN(parseInt(deviceId))) {
      return res.status(400).json({
        success: false,
        message: "Invalid device ID provided",
      });
    }

    // Validate that either both or neither deviceId and serialNumber are provided
    // Or handle the case where both are provided consistently
    if (deviceId && serialNumber) {
      // Optional: You might want to verify they refer to the same device
      const device = await Device.findOne({
        where: {
          id: parseInt(deviceId),
          serialNumber: serialNumber,
          userId: userId
        }
      });

      if (!device) {
        return res.status(400).json({
          success: false,
          message: "Device ID and serial number don't match or device doesn't belong to user",
        });
      }
    }

    const result = await ProjectService.getAcquiredProjects(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      deviceId: deviceId ? parseInt(deviceId) : null,
      serialNumber: serialNumber,
    });

    // Check if there was an error in the service response
    if (result.error) {
      return res.status(403).json({
        success: false,
        message: result.error,
      });
    }

    res.json({
      success: true,
      projects: result.projects,
      totalAcquiredProjects: result.totalProjectsAcquired,
      currentPage: result.currentPage,
      totalPages: result.totalPages,
      filteredByDevice: result.filteredByDevice,
      deviceId: result.deviceId,
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
      const { deviceId } = req.body;

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
