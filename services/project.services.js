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
      await transaction.rollback();
      throw error;
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

    const projectsWithImageUrls = rows.map((project) => {
      const projectData = project.toJSON();
      const baseUrl = process.env.BASE_URL || `https://roboninjaz.com`;

      if (projectData.images) {
        projectData.images = projectData.images.map((image) => {
          // Fixed URL to match your Express static middleware route
          const publicUrl = `${baseUrl}/uploads/projects/${image.projectId}/images/${image.filename}`;

          // Debug logging
          console.log("Generated URL:", publicUrl);
          console.log(
            "File should exist at:",
            `/var/www/production/new-project/device-management/public/projects/${image.projectId}/images/${image.filename}`
          );

          return {
            ...image,
            publicUrl: publicUrl,
          };
        });
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

  async getProjectByProjectId(projectId, userRole) {
    try {
      console.log("Service: Looking for project with projectId:", projectId);

      const whereCondition = {
        projectId: projectId,
        deleted_at: null,
      };

      // Apply version type filter based on user role
      if (!["admin", "super_admin", "tester"].includes(userRole)) {
        whereCondition.versionType = "release";
      }

      const project = await Project.findOne({
        where: whereCondition,
        include: [
          {
            model: ProjectFile,
            as: "files",
            where: { deleted_at: null },
            required: false,
          },
          {
            model: ProjectImage,
            as: "images",
            where: { deleted_at: null },
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
      });

      if (!project) {
        return null;
      }

      // Add public URLs for images
      const projectData = project.toJSON();
      if (projectData.images) {
        projectData.images = this.generateImageUrls(projectData.images);
      }

      return projectData;
    } catch (error) {
      console.error("Service error fetching project by projectId:", error);
      throw error;
    }
  }

  async searchProjects(searchParams, options = {}, userRole = null) {
    const { page = 1, limit = 10 } = options;
    const {
      keyword,
      componentId,
      projectName,
      projectId,
      categoryId,
      difficulty,
      projectType,
    } = searchParams;
    const offset = (page - 1) * limit;

    let whereCondition = {
      deleted_at: null,
    };

    // Apply version type filter based on user role
    if (!userRole || !["admin", "super_admin", "tester"].includes(userRole)) {
      whereCondition.version_type = "release";
    }

    // Base include conditions - all should be optional
    let includeConditions = [
      {
        model: ProjectFile,
        as: "files",
        required: false,
        where: { deleted_at: null },
      },
      {
        model: ProjectImage,
        as: "images",
        required: false,
        where: { deleted_at: null },
      },
      {
        model: Category,
        as: "category",
        attributes: ["id", "name"],
        required: false, // Make sure this is false
        where: { deleted_at: null },
      },
    ];

    // Handle component include separately based on whether we're filtering by component
    if (componentId) {
      // Only when filtering by component, make it required
      includeConditions.push({
        model: Component,
        as: "components",
        attributes: ["id", "name"],
        through: {
          attributes: ["quantity"],
        },
        where: {
          deleted_at: null,
          id: componentId,
        },
        required: true, // Required only when filtering
      });
    } else {
      // When not filtering by component, make it optional
      includeConditions.push({
        model: Component,
        as: "components",
        attributes: ["id", "name"],
        through: {
          attributes: ["quantity"],
        },
        where: { deleted_at: null },
        required: false, // Optional - this should allow projects with no components
      });
    }

    if (projectId) {
      whereCondition.project_id = projectId;
    }

    // Search by project name
    if (projectName) {
      whereCondition.name = {
        [Op.like]: `%${projectName}%`,
      };
    }

    if (categoryId) {
      whereCondition.category_id = categoryId;
    }

    // Search by difficulty
    if (difficulty) {
      whereCondition.difficulty = difficulty;
    }

    if (projectType) {
      whereCondition.project_type = projectType;
    }

    // Search by keywords
    if (keyword) {
      whereCondition[Op.or] = [
        { name: { [Op.like]: `%${keyword}%` } },
        { description: { [Op.like]: `%${keyword}%` } },
        { project_id: { [Op.like]: `%${keyword}%` } },
        sequelize.literal(`JSON_CONTAINS(keywords_list, '"${keyword}"')`),
        sequelize.where(sequelize.col("what_it_is"), {
          [Op.like]: `%${keyword}%`,
        }),
        sequelize.where(sequelize.col("how_it_works"), {
          [Op.like]: `%${keyword}%`,
        }),
      ];
    }

    try {
      console.log(
        "Final whereCondition:",
        JSON.stringify(whereCondition, null, 2)
      );

      const { count, rows } = await Project.findAndCountAll({
        where: whereCondition,
        include: includeConditions,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
        order: [["created_at", "DESC"]],
        distinct: true,
        subQuery: false, // Add this to avoid complex subqueries
      });

      console.log("Query result count:", count);
      console.log("Query result rows:", rows.length);

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
        stack: error.stack,
        whereCondition: whereCondition,
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
      await project.destroy({ transaction, force: true });

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

    // If this is the first project, set it as running
    const isFirstProject = deviceProjectCount === 0;

    const acquisition = await UserProjectAcquisition.create(
      {
        userId: userId,
        projectId: projectId,
        deviceId: deviceId,
        firmwareVersion: device.firmwareVersion,
        hasRemovalOccurred: false,
        isRunning: isFirstProject, // First project is automatically running
      },
      { transaction }
    );

    await transaction.commit();

    await device.update({ isModified: true }, { where: { id: deviceId } });

    return {
      acquisition,
      firmwareVersion: device.firmwareVersion,
      isRunning: isFirstProject,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async getAcquiredProjects(userId, options) {
  const { page = 1, limit = 10, deviceId, serialNumber } = options;
  const offset = (page - 1) * limit;

  const whereClause = {
    userId: userId,
    hasRemovalOccurred: false,
  };

  // Determine if we should show limited response
  // Only show limited response if ONLY serialNumber is passed (not deviceId)
  const showLimitedResponse = serialNumber && !deviceId;

  let targetDeviceId = null;

  // If filtering by deviceId, verify it belongs to the user
  if (deviceId) {
    const device = await Device.findOne({
      where: { 
        id: deviceId,
        userId: userId // CRITICAL: Ensure device belongs to user
      },
      attributes: ["id"],
    });

    if (!device) {
      // If device doesn't exist or doesn't belong to user, return empty results
      return {
        projects: [],
        totalProjectsAcquired: 0,
        currentPage: page,
        totalPages: 0,
        filteredByDevice: true,
        deviceId: deviceId,
        error: "Device not found or does not belong to user"
      };
    }

    targetDeviceId = deviceId;
    whereClause.deviceId = deviceId;
  }

  // If filtering by serialNumber, verify device belongs to user
  if (serialNumber) {
    const device = await Device.findOne({
      where: { 
        serialNumber: serialNumber,
        userId: userId // CRITICAL: Ensure device belongs to user
      },
      attributes: ["id"],
    });

    if (!device) {
      // If device with serial number doesn't exist or doesn't belong to user
      return {
        projects: [],
        totalProjectsAcquired: 0,
        currentPage: page,
        totalPages: 0,
        filteredByDevice: true,
        serialNumber: serialNumber,
        error: "Device not found or does not belong to user"
      };
    }

    targetDeviceId = device.id;
    whereClause.deviceId = device.id;
  }

  const { count, rows } = await UserProjectAcquisition.findAndCountAll({
    where: whereClause,
    // Include all attributes for full response, limit for limited response
    attributes: showLimitedResponse ? ["id", "createdAt"] : undefined,
    include: [
      {
        model: Project,
        as: "project",
        attributes: showLimitedResponse
          ? ["id", "name", "projectId"]
          : undefined,
        include: [
          {
            model: ProjectFile,
            as: "files",
            attributes: showLimitedResponse ? ["id", "filename"] : undefined,
            required: false,
          },
          {
            model: ProjectImage,
            as: "images",
            attributes: showLimitedResponse ? ["id", "filename"] : undefined,
            required: false,
          },
        ],
      },
      {
        model: Device,
        as: "device",
        required: true,
        // Add additional where clause to ensure device belongs to user
        where: {
          userId: userId // CRITICAL: Double-check device ownership
        },
        attributes: showLimitedResponse
          ? ["id", "deviceName", "serialNumber"]
          : undefined,
      },
    ],
    limit: limit,
    offset: offset,
    order: [["createdAt", "DESC"]],
    distinct: true,
    col: "id",
  });

  // Transform the response based on showLimitedResponse flag
  const projectsWithData = rows.map((acquisition) => {
    const acquisitionData = acquisition.toJSON();

    // Transform images to URL strings
    let imageUrls = [];
    if (acquisitionData.project && acquisitionData.project.images) {
      imageUrls = acquisitionData.project.images.map(
        (image) =>
          `/projects/${acquisitionData.project.id}/images/${image.filename}`
      );
    }

    if (showLimitedResponse) {
      // Limited response - only when serialNumber is passed alone
      return {
        id: acquisitionData.id,
        project: {
          id: acquisitionData.project.id,
          name: acquisitionData.project.name,
          projectId: acquisitionData.project.projectId,
          files: acquisitionData.project.files || [],
          images: imageUrls,
        },
        device: {
          id: acquisitionData.device.id,
          deviceName: acquisitionData.device.deviceName,
          serialNumber: acquisitionData.device.serialNumber,
        },
      };
    } else {
      // Full response - return all fields from the models
      return {
        ...acquisitionData, // Include all UserProjectAcquisition fields
        project: {
          ...acquisitionData.project, // Include all Project fields
          files: acquisitionData.project.files || [],
          images: imageUrls, // Replace original images array with URLs
        },
        device: {
          ...acquisitionData.device, // Include all Device fields
        },
      };
    }
  });

  return {
    projects: projectsWithData,
    totalProjectsAcquired: count,
    currentPage: page,
    totalPages: Math.ceil(count / limit),
    filteredByDevice: !!(deviceId || serialNumber),
    deviceId: targetDeviceId,
  };
}

async removeAcquiredProject(userId, projectId, deviceId) {
  const transaction = await sequelize.transaction();

  try {
    const acquisition = await UserProjectAcquisition.findOne({
      where: {
        userId: userId,
        projectId: projectId,
        deviceId: deviceId,
        hasRemovalOccurred: false,
      },
      transaction,
    });

    if (!acquisition) {
      throw new Error("Project acquisition not found");
    }

    const wasRunning = acquisition.isRunning;

    // Mark as removed
    acquisition.hasRemovalOccurred = true;
    await acquisition.save({ transaction });

    const device = await Device.findByPk(deviceId, { transaction });
    await device.update({ isModified: true }, { transaction });

    // If the removed project was running, activate the next available project
    if (wasRunning) {
      const nextProject = await UserProjectAcquisition.findOne({
        where: {
          deviceId: deviceId,
          hasRemovalOccurred: false,
        },
        order: [["createdAt", "ASC"]], // Get oldest (first acquired)
        transaction,
      });

      if (nextProject) {
        await nextProject.update({ isRunning: true }, { transaction });
      }
    }

    await transaction.commit();

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
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}


async initializeRunningProjects() {
  try {
    // Get all devices with their acquisitions
    const devices = await Device.findAll({
      include: [
        {
          model: UserProjectAcquisition,
          as: "acquisitions",
          where: {
            hasRemovalOccurred: false,
          },
        },
      ],
    });

    for (const device of devices) {
      if (device.acquisitions && device.acquisitions.length > 0) {
        // Set the first project as running
        const firstProject = device.acquisitions[0];
        
        // Reset all to false first
        await UserProjectAcquisition.update(
          { isRunning: false },
          {
            where: {
              deviceId: device.id,
              hasRemovalOccurred: false,
            },
          }
        );

        // Set first one as running
        await firstProject.update({ isRunning: true });
      }
    }

    console.log("✓ Initialized running projects for all devices");
    return { success: true };
  } catch (error) {
    console.error("Error initializing running projects:", error);
    throw error;
  }
}

async setRunningProject(userId, projectId, deviceId) {
  const transaction = await sequelize.transaction();

  try {
    // Verify device belongs to user
    const device = await Device.findOne({
      where: {
        id: deviceId,
        userId: userId,
      },
      transaction,
    });

    if (!device) {
      throw new Error("Device not found or does not belong to user");
    }

    // Find acquisition - projectId can be either database ID or projectId string
    let acquisition = await UserProjectAcquisition.findOne({
      where: {
        userId: userId,
        deviceId: deviceId,
        hasRemovalOccurred: false,
      },
      include: [
        {
          model: Project,
          as: "project",
          required: true,
          where: {
            [sequelize.Op.or]: [
              { id: isNaN(projectId) ? null : parseInt(projectId) },
              { projectId: projectId }, // projectId string like "NJ1001"
            ],
          },
        },
      ],
      transaction,
    });

    if (!acquisition) {
      throw new Error("Project not acquired for this device");
    }

    // Set all projects for this device to not running
    await UserProjectAcquisition.update(
      { isRunning: false },
      {
        where: {
          deviceId: deviceId,
          hasRemovalOccurred: false,
        },
        transaction,
      }
    );

    // Set selected project as running
    await acquisition.update({ isRunning: true }, { transaction });

    await device.update({ isModified: true }, { transaction });

    await transaction.commit();

    return {
      success: true,
      message: "Project set as running",
      runningProject: {
        projectId: acquisition.projectId,
        project: {
          id: acquisition.project.id,
          name: acquisition.project.name,
          projectId: acquisition.project.projectId,
        },
        deviceId: acquisition.deviceId,
      },
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async getRunningProjectForDevice(deviceId, userId) {
  try {
    // Verify device belongs to user
    const device = await Device.findOne({
      where: {
        id: deviceId,
        userId: userId,
      },
    });

    if (!device) {
      throw new Error("Device not found");
    }

    const runningAcquisition = await UserProjectAcquisition.findOne({
      where: {
        deviceId: deviceId,
        isRunning: true,
        hasRemovalOccurred: false,
      },
      include: [
        {
          model: Project,
          as: "project",
          attributes: ["id", "name", "projectId", "description"],
        },
      ],
    });

    if (!runningAcquisition) {
      return {
        success: true,
        runningProject: null,
        message: "No project is currently running on this device",
      };
    }

    return {
      success: true,
      runningProject: {
        acquisitionId: runningAcquisition.id,
        projectId: runningAcquisition.projectId,
        project: runningAcquisition.project,
        deviceId: runningAcquisition.deviceId,
      },
    };
  } catch (error) {
    throw error;
  }
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
