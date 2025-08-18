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

async getAcquiredProjects(userId, options) {
  const { page = 1, limit = 10, deviceId, serialNumber } = options;
  const offset = (page - 1) * limit;

  const whereClause = {
    userId: userId,
    hasRemovalOccurred: false,
  };

  // If filtering by deviceId, add it directly to the where clause
  if (deviceId) {
    whereClause.deviceId = deviceId;
  }

  // If filtering by serialNumber, we need to find the device first
  if (serialNumber) {
    const device = await Device.findOne({
      where: { serialNumber: serialNumber },
      attributes: ['id']
    });
    
    if (!device) {
      // If device with serial number doesn't exist, return empty results
      return {
        projects: [],
        totalProjectsAcquired: 0,
        currentPage: page,
        totalPages: 0,
      };
    }
    
    // Add the device ID to the where clause
    whereClause.deviceId = device.id;
  }

  const { count, rows } = await UserProjectAcquisition.findAndCountAll({
    where: whereClause,
    attributes: ["id", "createdAt"],
    include: [
      {
        model: Project,
        as: "project",
        attributes: ["id", "name"],
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
      {
        model: Device,
        as: "device",
        required: true, // Always require device to be present
        attributes: ["id", "deviceName", "serialNumber"],
      },
    ],
    limit: limit,
    offset: offset,
    order: [["createdAt", "DESC"]],
    distinct: true,
    col: "id",
  });

  // Transform the response
  const projectsWithMinimalData = rows.map((acquisition) => {
    const acquisitionData = acquisition.toJSON();

    // Transform images to URL strings
    let imageUrls = [];
    if (acquisitionData.project && acquisitionData.project.images) {
      imageUrls = acquisitionData.project.images.map(
        (image) =>
          `/projects/${acquisitionData.project.id}/images/${image.filename}`
      );
    }

    return {
      id: acquisitionData.id,
      project: {
        id: acquisitionData.project.id,
        name: acquisitionData.project.name,
        files: acquisitionData.project.files || [],
        images: imageUrls,
      },
      device: {
        id: acquisitionData.device.id,
        deviceName: acquisitionData.device.deviceName,
        serialNumber: acquisitionData.device.serialNumber,
      },
    };
  });

  return {
    projects: projectsWithMinimalData,
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

    await device.update({ isModified: true });

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
