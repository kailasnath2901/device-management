const Project = require("../model/project.model");
const ProjectFile = require("../model/project-files.model");
const ProjectImage = require("../model/projectImage.model");
const Category = require("../model/category.model");
const Component = require("../model/component.model");
const ProjectComponent = require("../model/projectComponent.model");
const UserProjectAcquisition = require("../model/user-project-acquisition.model");
const Device = require("../model/user-device.model");
const { Sequelize, Op, where } = require("sequelize");
const sequelize = require("../config/sequelize");
const path = require("path");
const fs = require("fs");
const AdmZip = require("adm-zip");

class ProjectService {
  async createCategory(categoryData) {
    try {
      const category = await Category.create(categoryData);
      return category;
    } catch (error) {
      throw new Error(`Error creating category: ${error.message}`);
    }
  }

  async getCategories(options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const offset = (page - 1) * limit;

      const { count, rows } = await Category.findAndCountAll({
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
        order: [["name", "ASC"]],
      });

      return {
        categories: rows,
        totalCategories: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page, 10),
      };
    } catch (error) {
      throw new Error(`Error fetching categories: ${error.message}`);
    }
  }

  async getCategoryById(id) {
    try {
      const category = await Category.findByPk(id);
      if (!category) {
        throw new Error("Category not found");
      }
      return category;
    } catch (error) {
      throw new Error(`Error fetching category: ${error.message}`);
    }
  }

  async updateCategory(id, updateData) {
    try {
      const category = await Category.findByPk(id);
      if (!category) {
        throw new Error("Category not found");
      }
      await category.update(updateData);
      return category;
    } catch (error) {
      throw new Error(`Error updating category: ${error.message}`);
    }
  }

  async deleteCategory(id) {
    try {
      const category = await Category.findByPk(id);
      if (!category) {
        throw new Error("Category not found");
      }

      // Check if any projects are using this category
      const projectsCount = await Project.count({
        where: { categoryId: id },
      });

      if (projectsCount > 0) {
        throw new Error(
          "Cannot delete category. Projects are still using this category."
        );
      }

      await category.destroy();
      return { message: "Category deleted successfully" };
    } catch (error) {
      throw new Error(`Error deleting category: ${error.message}`);
    }
  }

  async searchCategories(searchTerm, options = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    try {
      const { count, rows } = await Category.findAndCountAll({
        where: {
          name: {
            [Op.like]: `%${searchTerm}%`, // Changed from Op.iLike to Op.like for MySQL
          },
        },
        attributes: ["id", "name", "description"],
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
        order: [["name", "ASC"]],
      });

      return {
        categories: rows,
        totalCategories: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page, 10),
      };
    } catch (error) {
      throw new Error(`Error searching categories: ${error.message}`);
    }
  }

  // Search components by name
  async searchComponents(searchTerm, options = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    try {
      const { count, rows } = await Component.findAndCountAll({
        where: {
          name: {
            [Op.like]: `%${searchTerm}%`, // Changed from Op.iLike to Op.like for MySQL
          },
        },
        attributes: ["id", "name", "description"],
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
        order: [["name", "ASC"]],
      });

      return {
        components: rows,
        totalComponents: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page, 10),
      };
    } catch (error) {
      throw new Error(`Error searching components: ${error.message}`);
    }
  }
  // Component CRUD operations
  async createComponent(componentData) {
    try {
      const component = await Component.create(componentData);
      return component;
    } catch (error) {
      throw new Error(`Error creating component: ${error.message}`);
    }
  }

  async getComponents(options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const offset = (page - 1) * limit;

      const { count, rows } = await Component.findAndCountAll({
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
        order: [["name", "ASC"]],
      });

      return {
        components: rows,
        totalComponents: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page, 10),
      };
    } catch (error) {
      throw new Error(`Error fetching components: ${error.message}`);
    }
  }

  async getComponentById(id) {
    try {
      const component = await Component.findByPk(id);
      if (!component) {
        throw new Error("Component not found");
      }
      return component;
    } catch (error) {
      throw new Error(`Error fetching component: ${error.message}`);
    }
  }

  async updateComponent(id, updateData) {
    try {
      const component = await Component.findByPk(id);
      if (!component) {
        throw new Error("Component not found");
      }
      await component.update(updateData);
      return component;
    } catch (error) {
      throw new Error(`Error updating component: ${error.message}`);
    }
  }

  async deleteComponent(id) {
    try {
      const component = await Component.findByPk(id);
      if (!component) {
        throw new Error("Component not found");
      }

      // Check if any projects are using this component
      const projectsCount = await ProjectComponent.count({
        where: { componentId: id },
      });

      if (projectsCount > 0) {
        throw new Error(
          "Cannot delete component. Projects are still using this component."
        );
      }

      await component.destroy();
      return { message: "Component deleted successfully" };
    } catch (error) {
      throw new Error(`Error deleting component: ${error.message}`);
    }
  }

  // Create project folder structure
  async createProjectFolder(projectId) {
    const projectFolderPath = path.join(
      process.cwd(),
      "uploads",
      "projects",
      projectId.toString()
    );

    if (!fs.existsSync(projectFolderPath)) {
      fs.mkdirSync(projectFolderPath, { recursive: true });
    }

    return projectFolderPath;
  }

  // Delete project folder and all contents
  async deleteProjectFolder(projectId) {
    const projectFolderPath = path.join(
      process.cwd(),
      "uploads",
      "projects",
      projectId.toString()
    );

    if (fs.existsSync(projectFolderPath)) {
      fs.rmSync(projectFolderPath, { recursive: true, force: true });
    }
  }

  async createProject(req, res) {
    try {
      const userId = req.user.id;
      console.log(req.body);

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

      if (!req.body.howItWorks) {
        return res.status(400).json({
          success: false,
          message: "howItWorks field is required",
        });
      }

      if (req.body.projectId) {
        // Check if custom projectId already exists
        const existingProject = await Project.findOne({
          where: { projectId: req.body.projectId },
        });

        if (existingProject) {
          return res.status(400).json({
            success: false,
            message:
              "Project ID already exists. Please choose a different one.",
          });
        }
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
        versionType: req.body.versionType || "development",
        youtubeLink: req.body.youtubeLink,
        projectType: req.body.projectType || "free",
        maxAcquisitions: req.body.maxAcquisitions || 5,
        lastUpdated: new Date(),
        version: 1,
        userId,
        projectId: req.body.projectId || null,
      };

      // Create project
      const project = await Project.create(projectData);

      // Create project folder
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

          // Check if file is a zip
          const isZip =
            file.mimetype === "application/zip" ||
            file.mimetype === "application/x-zip-compressed" ||
            path.extname(file.originalname).toLowerCase() === ".zip";

          if (isZip) {
            try {
              // Create a folder with the zip filename (without extension)
              const zipFolderName = path.basename(
                file.originalname,
                path.extname(file.originalname)
              );
              const extractPath = path.join(projectFolder, zipFolderName);

              if (!fs.existsSync(extractPath)) {
                fs.mkdirSync(extractPath, { recursive: true });
              }

              // Extract the zip file
              const zip = new AdmZip(filePath);
              zip.extractAllTo(extractPath, true);

              // Update the file record to indicate it's extracted
              return ProjectFile.create({
                projectId: project.id,
                filename: file.filename,
                originalName: file.originalname,
                fileType: path.extname(file.originalname),
                fileSize: file.size,
                filePath: filePath,
                mimetype: file.mimetype,
                isZipExtracted: true,
                originalZipName: file.originalname,
                extractedPath: extractPath, // Optional: store the extraction path
              });
            } catch (zipError) {
              console.error("Error extracting zip file:", zipError);
              // Still create the file record but mark as not extracted
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
            }
          } else {
            // Regular file (not zip)
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
          }
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

  async updateProject(projectId, updateData, files = {}) {
    const transaction = await sequelize.transaction();

    try {
      const project = await Project.findByPk(projectId, { transaction });
      if (!project) {
        throw new Error("Project not found");
      }

      const {
        requiredComponents = [],
        imagesToDelete = [],
        filesToDelete = [],
        ...otherData
      } = updateData;

      // Update basic project data
      await project.update(otherData, { transaction });

      // Handle image deletions
      if (imagesToDelete.length > 0) {
        for (const imageId of imagesToDelete) {
          const imageToDelete = await ProjectImage.findByPk(imageId, {
            transaction,
          });
          if (imageToDelete && imageToDelete.projectId === project.id) {
            // Delete physical file
            if (fs.existsSync(imageToDelete.filePath)) {
              fs.unlinkSync(imageToDelete.filePath);
            }
            // Delete from database
            await imageToDelete.destroy({ transaction });
          }
        }
      }

      // Handle file deletions
      if (filesToDelete.length > 0) {
        for (const fileId of filesToDelete) {
          const fileToDelete = await ProjectFile.findByPk(fileId, {
            transaction,
          });
          if (fileToDelete && fileToDelete.projectId === project.id) {
            // Delete physical file
            if (fs.existsSync(fileToDelete.filePath)) {
              fs.unlinkSync(fileToDelete.filePath);
            }
            // Delete from database
            await fileToDelete.destroy({ transaction });
          }
        }
      }

      // Create project folder structure
      const projectFolder = path.join(
        process.cwd(),
        "public",
        "projects",
        projectId.toString()
      );

      // Handle new images
      if (files.images && files.images.length > 0) {
        const imageFolder = path.join(projectFolder, "images");
        if (!fs.existsSync(imageFolder)) {
          fs.mkdirSync(imageFolder, { recursive: true });
        }

        const imageData = files.images.map((image) => {
          const imagePath = path.join(imageFolder, image.filename);

          // Move file to correct location
          if (fs.existsSync(image.path)) {
            fs.renameSync(image.path, imagePath);
          }

          return {
            projectId,
            filename: image.filename,
            originalName: image.originalname,
            filePath: imagePath,
            fileSize: image.size,
            mimetype: image.mimetype,
            isMainImage: false,
          };
        });

        await ProjectImage.bulkCreate(imageData, { transaction });
      }

      // Handle new files
      if (files.projectFiles && files.projectFiles.length > 0) {
        const fileData = files.projectFiles.map((file) => {
          const filePath = path.join(projectFolder, file.filename);

          // Move file to correct location
          if (fs.existsSync(file.path)) {
            fs.renameSync(file.path, filePath);
          }

          return {
            projectId,
            filename: file.filename,
            originalName: file.originalname,
            fileType: path.extname(file.originalname),
            fileSize: file.size,
            filePath: filePath,
            mimetype: file.mimetype,
            isZipExtracted: false,
            originalZipName: null,
          };
        });

        await ProjectFile.bulkCreate(fileData, { transaction });
      }

      // Update components if provided
      if (requiredComponents.length > 0) {
        // Delete existing components
        await ProjectComponent.destroy({
          where: { projectId },
          transaction,
        });

        // Add new components
        const componentData = requiredComponents.map((comp) => ({
          projectId,
          componentId: typeof comp === "object" ? comp.componentId : comp,
          quantity: typeof comp === "object" ? comp.quantity || 1 : 1,
        }));

        await ProjectComponent.bulkCreate(componentData, { transaction });
      }

      await transaction.commit();

      // Return the updated project with publicUrls
      return await this.getProjectById(projectId);
    } catch (error) {
      console.error("Error updating project:", error);

      // Handle validation errors specifically
      if (error.name === 'SequelizeValidationError') {
        const validationErrors = error.errors.map(err => ({
          field: err.path,
          message: err.message
        }));

        return res.status(400).json({
          success: false,
          message: "Validation error",
          validationErrors: validationErrors
        });
      }

      // Handle unique constraint violations
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
          success: false,
          message: "Project ID already exists. Please choose a different one.",
          field: error.errors[0]?.path
        });
      }

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getProjectById(projectId) {
    try {
      const project = await Project.findByPk(projectId, {
        include: [
          {
            model: ProjectFile,
            as: "files",
            required: false,
          },
          {
            model: ProjectImage,
            as: "images",
            required: false,
          },
          {
            model: Category,
            as: "category",
            attributes: ["id", "name", "description"],
          },
          {
            model: Component,
            as: "components",
            attributes: ["id", "name", "description", "price"],
            through: {
              attributes: ["quantity"],
            },
          },
        ],
      });

      if (!project) {
        throw new Error("Project not found");
      }

      // Add public URLs for images
      const projectData = project.toJSON();
      const baseUrl =
        process.env.BASE_URL || `http://localhost:${process.env.PORT || 8015}`;

      if (projectData.images) {
        projectData.images = projectData.images.map((image) => ({
          ...image,
          publicUrl: `${baseUrl}/projects/${image.projectId}/images/${image.filename}`,
        }));
      }

      return projectData;
    } catch (error) {
      throw new Error(`Error fetching project: ${error.message}`);
    }
  }

  async getUserProjects(userId, userRole, options = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    const whereCondition = {};

    if (!["admin", "super_admin", "tester"].includes(userRole)) {
      whereCondition.versionType = "release";
    }

    const { count, rows } = await Project.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: ProjectFile,
          as: "files",
          required: false,
        },
        {
          model: ProjectImage,
          as: "images",
          required: false,
        },
        {
          model: Category,
          as: "category",
          attributes: ["id", "name"],
        },
        {
          model: Component,
          as: "components",
          attributes: ["id", "name"],
          through: {
            attributes: ["quantity"],
          },
        },
      ],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: [["createdAt", "DESC"]],
      distinct: true,
    });

    // Add public URLs for images
    const projectsWithImageUrls = rows.map((project) => {
      const projectData = project.toJSON();
      const baseUrl =
        process.env.BASE_URL || `http://localhost:${process.env.PORT || 8015}`;
      if (projectData.images) {
        projectData.images = projectData.images.map((image) => ({
          ...image,
          publicUrl: `${baseUrl}/projects/${image.projectId}/images/${image.filename}`,
        }));
      }
      return projectData;
    });

    return {
      projects: projectsWithImageUrls,
      totalProjects: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page, 10),
    };
  }

  async searchProjects(searchParams, options = {}) {
    const { page = 1, limit = 10 } = options;
    const {
      keyword,
      componentId,
      projectName,
      projectId, // This now refers to the custom projectId field
      categoryId,
      difficulty,
      projectType,
    } = searchParams;

    const offset = (page - 1) * limit;

    console.log("Service received parameters:", searchParams);

    let whereCondition = {
      deletedAt: null, // Use camelCase as defined in your model
      versionType: "release", // Only show release version projects
    };

    let includeConditions = [
      {
        model: ProjectFile,
        as: "files",
        required: false,
        where: { deletedAt: null }, // Use camelCase
      },
      {
        model: ProjectImage,
        as: "images",
        required: false,
        where: { deletedAt: null }, // Use camelCase
      },
      {
        model: Category,
        as: "category",
        attributes: ["id", "name"],
        where: { deletedAt: null }, // Use camelCase
      },
      {
        model: Component,
        as: "components",
        attributes: ["id", "name"],
        through: {
          attributes: ["quantity"],
        },
        where: { deletedAt: null }, // Use camelCase
        required: false, // Set to false by default
      },
    ];

    // Search by custom projectId (not the primary key id)
    if (projectId) {
      console.log("Searching for projectId:", projectId);
      whereCondition.projectId = {
        [Op.like]: `%${projectId.trim()}%`, // Trim whitespace
      };
    }

    // Search by project name
    if (projectName) {
      whereCondition.name = {
        [Op.like]: `%${projectName.trim()}%`,
      };
    }

    // Search by category
    if (categoryId) {
      whereCondition.categoryId = parseInt(categoryId); // Use camelCase
    }

    // Search by difficulty
    if (difficulty) {
      whereCondition.difficulty = difficulty.toLowerCase().trim();
    }

    // Search by project type
    if (projectType) {
      whereCondition.projectType = projectType.toLowerCase().trim(); // Use camelCase
    }

    // Search by keywords - Fixed version
    if (keyword) {
      const trimmedKeyword = keyword.trim();
      console.log("Searching for keyword:", trimmedKeyword);

      whereCondition[Op.or] = [
        { name: { [Op.like]: `%${trimmedKeyword}%` } },
        { description: { [Op.like]: `%${trimmedKeyword}%` } },
        { projectId: { [Op.like]: `%${trimmedKeyword}%` } },
        { whatItIs: { [Op.like]: `%${trimmedKeyword}%` } }, // Use camelCase
        { howItWorks: { [Op.like]: `%${trimmedKeyword}%` } }, // Use camelCase

        // For JSON search in keywordsList
        sequelize.literal(`JSON_UNQUOTE(JSON_EXTRACT(keywords_list, '$[*]')) LIKE '%${trimmedKeyword}%'`),
      ];
    }

    // Search by component
    if (componentId) {
      // Update the components include condition
      const componentIndex = includeConditions.findIndex(inc => inc.as === "components");
      if (componentIndex !== -1) {
        includeConditions[componentIndex].where = {
          ...includeConditions[componentIndex].where,
          id: parseInt(componentId),
        };
        includeConditions[componentIndex].required = true;
      }
    }

    console.log("Final where condition:", JSON.stringify(whereCondition, null, 2));

    try {
      const { count, rows } = await Project.findAndCountAll({
        where: whereCondition,
        include: includeConditions,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
        order: [["createdAt", "DESC"]], // Use camelCase
        distinct: true,
        logging: console.log, // Enable SQL logging for debugging
      });

      console.log(`Found ${count} projects matching search criteria`);

      const projectsWithImageUrls = rows.map((project) => {
        const projectData = project.toJSON();
        if (projectData.images) {
          projectData.images = this.generateImageUrls(projectData.images);
        }
        return projectData;
      });

      return {
        projects: projectsWithImageUrls,
        totalProjects: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page, 10),
      };
    } catch (error) {
      console.error("Search error:", {
        message: error.message,
        sql: error.sql,
        parameters: searchParams,
        whereCondition: whereCondition,
        stack: error.stack,
      });
      throw error;
    }
  }

  generateImageUrls(images) {
    const baseUrl =
      process.env.BASE_URL || `http://localhost:${process.env.PORT || 8015}`;

    return images.map((image) => ({
      ...image,
      publicUrl: `${baseUrl}/projects/${image.projectId}/images/${image.filename}`,
    }));
  }

  async deleteProject(projectId, userId, userRole) {
    const transaction = await sequelize.transaction();

    try {
      const project = await Project.findByPk(projectId, {
        include: [
          { model: ProjectFile, as: "files" },
          { model: ProjectImage, as: "images" },
        ],
        transaction,
      });

      if (!project) {
        throw new Error("Project not found");
      }

      // Authorization check
      if (
        userRole !== "admin" &&
        userRole !== "super_admin" &&
        project.userId !== userId
      ) {
        throw new Error("Unauthorized to delete this project");
      }

      // Delete associated user project acquisitions
      await UserProjectAcquisition.destroy({
        where: { projectId },
        transaction,
      });

      // Delete project components
      await ProjectComponent.destroy({
        where: { projectId },
        transaction,
      });

      // Delete project files from database
      await ProjectFile.destroy({
        where: { projectId },
        transaction,
      });

      // Delete project images from database
      await ProjectImage.destroy({
        where: { projectId },
        transaction,
      });

      // Delete the project
      await project.destroy({ transaction });

      // Delete the project folder and all files
      await this.deleteProjectFolder(projectId);

      await transaction.commit();
      return {
        message: "Project and all associated files deleted successfully",
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async deleteProjectImage(imageId, userId, userRole) {
    try {
      const image = await ProjectImage.findByPk(imageId, {
        include: [
          {
            model: Project,
            as: "project",
            attributes: ["id", "userId"],
          },
        ],
      });

      if (!image) {
        throw new Error("Image not found");
      }

      // Authorization check
      if (
        userRole !== "admin" &&
        userRole !== "super_admin" &&
        image.project.userId !== userId
      ) {
        throw new Error("Unauthorized to delete this image");
      }

      // Delete physical file
      if (fs.existsSync(image.filePath)) {
        fs.unlinkSync(image.filePath);
      }

      // Delete from database
      await image.destroy();

      return { message: "Image deleted successfully" };
    } catch (error) {
      throw new Error(`Error deleting image: ${error.message}`);
    }
  }

  // Keep existing methods for backward compatibility
  async updateProjectFirmware(projectId, newFirmwareVersion, userRole) {
    if (userRole !== "admin" && userRole !== "super_admin") {
      throw new Error("Unauthorized: Only admins can update project firmware");
    }

    const project = await Project.findByPk(projectId, {
      include: [
        {
          model: ProjectFile,
          as: "files",
        },
      ],
    });

    if (!project) {
      throw new Error("Project not found");
    }

    project.version = newFirmwareVersion;
    project.lastUpdated = new Date();
    await project.save();

    return project;
  }

  async getCurrentUserVersion(userId) {
    const latestAcquisition = await UserProjectAcquisition.findOne({
      where: { userId },
      order: [["firmwareVersion", "DESC"]],
    });
    return latestAcquisition?.firmwareVersion || "1.0";
  }

  async getAcquiredProjects(userId, options) {
    const { page = 1, limit = 10, deviceId, serialNumber } = options;
    const offset = (page - 1) * limit;

    const whereClause = {
      userId: userId,
      hasRemovalOccurred: false,
    };

    // Build device include clause based on filter type
    const deviceInclude = {
      model: Device,
      as: "device",
      required: false,
    };

    // Set device attributes based on filter type
    if (serialNumber) {
      // When filtering by serial number, return limited device info
      deviceInclude.attributes = ["id", "deviceName", "serialNumber"];
      deviceInclude.where = {
        serialNumber: serialNumber,
      };
      deviceInclude.required = true; // Make it an INNER JOIN when filtering by serial number
    } else {
      // When filtering by deviceId or no filter, return full device info
      deviceInclude.attributes = [
        "id",
        "deviceName",
        "serialNumber",
        "deviceType",
        "firmwareVersion",
        "isModified",
        "nickName",
        "lastUpdated",
      ];

      // If filtering by deviceId, add it to the main where clause
      if (deviceId) {
        whereClause.deviceId = deviceId;
      }
    }

    const { count, rows } = await UserProjectAcquisition.findAndCountAll({
      where: whereClause,
      attributes: ["id", "createdAt"],
      include: [
        {
          model: Project,
          as: "project",
          attributes: serialNumber
            ? // Limited project attributes when filtering by serial number
            ["id", "name"]
            : // Full project attributes when filtering by deviceId or no filter
            [
              "id",
              "projectId",
              "name",
              "description",
              "whatItIs",
              "howItWorks",
              "priceInInr",
              "keywordsList",
              "difficulty",
              "categoryId",
              "testAndTroubleshootLink",
              "versionType",
              "youtubeLink",
              "projectType",
              "maxAcquisitions",
              "version",
              "lastUpdated",
              "dashboard",
              "createdAt",
              "updatedAt",
            ],
          include: [
            {
              model: ProjectFile,
              as: "files",
              attributes: ["id", "filename"],
              required: false,
            },
            {
              model: ProjectImage,
              as: "images",
              attributes: ["id", "filename"],
              required: false,
            },
          ],
        },
        deviceInclude,
      ],
      limit: limit,
      offset: offset,
      order: [["createdAt", "DESC"]],
      distinct: true,
      col: "id",
    });

    // Transform the response to match the expected format
    const projectsWithImageUrls = rows.map((acquisition) => {
      const acquisitionData = acquisition.toJSON();

      // Transform images to the expected format (array of URL strings)
      let imageUrls = [];
      if (acquisitionData.project && acquisitionData.project.images) {
        imageUrls = acquisitionData.project.images.map(
          (image) =>
            `/projects/${acquisitionData.project.id}/images/${image.filename}`
        );
      }

      // Return in the expected format
      return {
        id: acquisitionData.id,
        project: serialNumber
          ? {
            // Limited project info when filtering by serial number
            id: acquisitionData.project.id,
            name: acquisitionData.project.name,
            files: acquisitionData.project.files || [],
            images: imageUrls,
          }
          : {
            // Full project info when filtering by deviceId or no filter
            id: acquisitionData.project.id,
            projectId: acquisitionData.project.projectId,
            name: acquisitionData.project.name,
            description: acquisitionData.project.description,
            whatItIs: acquisitionData.project.whatItIs,
            howItWorks: acquisitionData.project.howItWorks,
            priceInInr: acquisitionData.project.priceInInr,
            keywordsList: acquisitionData.project.keywordsList,
            difficulty: acquisitionData.project.difficulty,
            categoryId: acquisitionData.project.categoryId,
            testAndTroubleshootLink:
              acquisitionData.project.testAndTroubleshootLink,
            versionType: acquisitionData.project.versionType,
            youtubeLink: acquisitionData.project.youtubeLink,
            projectType: acquisitionData.project.projectType,
            maxAcquisitions: acquisitionData.project.maxAcquisitions,
            version: acquisitionData.project.version,
            lastUpdated: acquisitionData.project.lastUpdated,
            dashboard: acquisitionData.project.dashboard,
            createdAt: acquisitionData.project.createdAt,
            updatedAt: acquisitionData.project.updatedAt,
            files: acquisitionData.project.files || [],
            images: imageUrls,
          },
        device: acquisitionData.device
          ? serialNumber
            ? {
              // Limited device info when filtering by serial number
              id: acquisitionData.device.id,
              deviceName: acquisitionData.device.deviceName,
              serialNumber: acquisitionData.device.serialNumber,
            }
            : {
              // Full device info when filtering by deviceId or no filter
              id: acquisitionData.device.id,
              deviceName: acquisitionData.device.deviceName,
              serialNumber: acquisitionData.device.serialNumber,
              deviceType: acquisitionData.device.deviceType,
              firmwareVersion: acquisitionData.device.firmwareVersion,
              isModified: acquisitionData.device.isModified,
              nickName: acquisitionData.device.nickName,
              lastUpdated: acquisitionData.device.lastUpdated,
            }
          : null,
      };
    });

    return {
      projects: projectsWithImageUrls,
      totalProjectsAcquired: count,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
    };
  }

  async removeAcquiredProject(userId, projectId, deviceId) {
    const acquisition = await UserProjectAcquisition.findOne({
      where: {
        userId: userId,
        projectId: projectId,
        deviceId: deviceId,
        hasRemovalOccurred: false,
      },
    });

    if (!acquisition) {
      throw new Error("Project acquisition not found");
    }

    const device = await Device.findByPk(deviceId);

    acquisition.hasRemovalOccurred = true;
    await acquisition.save();

    const remainingProjects = await UserProjectAcquisition.count({
      where: {
        deviceId: deviceId,
        hasRemovalOccurred: false,
      },
    });

    return {
      currentFirmwareVersion: device.firmwareVersion,
      remainingProjects: remainingProjects,
    };
  }

  async updateUserProjectFirmware(userId, projectId, newFirmwareVersion) {
    const acquisition = await UserProjectAcquisition.findOne({
      where: {
        userId,
        projectId,
      },
    });

    if (!acquisition) {
      throw new Error("Project acquisition not found");
    }

    acquisition.firmwareVersion = newFirmwareVersion;
    await acquisition.save();

    return acquisition;
  }

  incrementFirmwareVersion(version) {
    const versionNum = parseFloat(version);
    return (versionNum + 0.1).toFixed(1);
  }

  async acquireProject(userId, projectId, deviceId) {
    const transaction = await sequelize.transaction();

    try {
      const project = await Project.findByPk(projectId, { transaction });
      if (!project) {
        throw new Error("Project not found");
      }

      const device = await Device.findOne({
        where: {
          id: deviceId,
          userId: userId,
        },
        transaction,
      });

      if (!device) {
        throw new Error("Device not found or does not belong to this user");
      }

      const existingAcquisition = await UserProjectAcquisition.findOne({
        where: {
          userId: userId,
          projectId: projectId,
          deviceId: deviceId,
          hasRemovalOccurred: false,
        },
        transaction,
      });

      if (existingAcquisition) {
        throw new Error(
          "You have already acquired this project for this device"
        );
      }

      const deviceProjectCount = await UserProjectAcquisition.count({
        where: {
          deviceId: deviceId,
          hasRemovalOccurred: false,
        },
        transaction,
      });

      if (deviceProjectCount >= 5) {
        throw new Error(
          "This device already has the maximum of 5 projects. Please remove a project before adding a new one."
        );
      }

      const acquisition = await UserProjectAcquisition.create(
        {
          userId: userId,
          projectId: projectId,
          deviceId: deviceId,
          firmwareVersion: device.firmwareVersion,
          hasRemovalOccurred: false,
        },
        { transaction }
      );

      await transaction.commit();

      await device.update({ isModified: true }, { where: { id: deviceId } });

      return {
        acquisition,
        firmwareVersion: device.firmwareVersion,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async getUserDevices(userId) {
    const devices = await Device.findAll({
      where: {
        user_id: userId, // Make sure this matches your column name
      },
      include: [
        {
          model: UserProjectAcquisition,
          as: "acquisitions",
          where: {
            hasRemovalOccurred: false,
          },
          required: false,
          include: [
            {
              model: Project,
              as: "project",
            },
          ],
        },
      ],
      // Explicitly include is_modified to ensure it's selected
      attributes: {
        include: ["is_modified"],
      },
    });

    const devicesWithCounts = devices.map((device) => {
      const deviceData = device.toJSON();
      deviceData.projectCount = device.acquisitions
        ? device.acquisitions.length
        : 0;
      return deviceData;
    });

    return devicesWithCounts;
  }
}

module.exports = new ProjectService();
