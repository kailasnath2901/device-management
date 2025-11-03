// services/project-rating.service.js
const ProjectRating = require("../model/project-rating.model");
const Project = require("../model/project.model");
const User = require("../model/user.model");
const { Op } = require("sequelize");

class ProjectRatingService {
  /**
   * Add or update rating for a project by user (only one rating per user per project)
   */
  async addRating(userId, projectId, rating, review = null) {
    try {
      // Validate rating
      if (rating < 1 || rating > 5) {
        throw new Error("Rating must be between 1 and 5");
      }

      // Validate project exists
      const project = await Project.findByPk(projectId);
      if (!project) {
        throw new Error("Project not found");
      }

      // Validate user exists
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Check if user already rated this project
      let existingRating = await ProjectRating.findOne({
        where: {
          projectId: projectId,
          userId: userId,
        },
      });

      if (existingRating) {
        // Update existing rating
        await existingRating.update({
          rating: rating,
          review: review || existingRating.review,
        });

        return {
          success: true,
          message: "Rating updated successfully",
          isNew: false,
          rating: existingRating,
        };
      } else {
        // Create new rating
        const newRating = await ProjectRating.create({
          projectId: projectId,
          userId: userId,
          rating: rating,
          review: review,
        });

        return {
          success: true,
          message: "Rating added successfully",
          isNew: true,
          rating: newRating,
        };
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get rating for a specific user on a project
   */
  async getUserRating(userId, projectId) {
    try {
      const rating = await ProjectRating.findOne({
        where: {
          projectId: projectId,
          userId: userId,
        },
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "username", "email"],
          },
        ],
      });

      if (!rating) {
        return {
          success: false,
          message: "No rating found for this user on this project",
          rating: null,
        };
      }

      return {
        success: true,
        rating: rating,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all ratings for a project with statistics
   */
  async getProjectRatings(projectId, page = 1, limit = 10) {
    try {
      // Validate project exists
      const project = await Project.findByPk(projectId);
      if (!project) {
        throw new Error("Project not found");
      }

      const offset = (page - 1) * limit;

      // Get all ratings
      const { count, rows } = await ProjectRating.findAndCountAll({
        where: { projectId: projectId },
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "username", "email"],
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: limit,
        offset: offset,
      });

      // Calculate statistics
      const stats = await this.getRatingStats(projectId);

      return {
        success: true,
        ratings: rows,
        stats: stats,
        pagination: {
          totalRatings: count,
          totalPages: Math.ceil(count / limit),
          currentPage: page,
          limit: limit,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get rating statistics for a project
   */
  async getRatingStats(projectId) {
    try {
      const ratings = await ProjectRating.findAll({
        where: { projectId: projectId },
        attributes: ["rating"],
      });

      if (ratings.length === 0) {
        return {
          totalRatings: 0,
          averageRating: 0,
          ratingDistribution: {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0,
          },
        };
      }

      const ratingValues = ratings.map((r) => r.rating);
      const sum = ratingValues.reduce((a, b) => a + b, 0);
      const average = (sum / ratingValues.length).toFixed(2);

      // Distribution
      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      ratingValues.forEach((rating) => {
        distribution[rating]++;
      });

      return {
        totalRatings: ratings.length,
        averageRating: parseFloat(average),
        ratingDistribution: distribution,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a rating (user can only delete their own rating)
   */
  async deleteRating(userId, ratingId) {
    try {
      const rating = await ProjectRating.findByPk(ratingId);

      if (!rating) {
        throw new Error("Rating not found");
      }

      if (rating.userId !== userId) {
        throw new Error("You can only delete your own ratings");
      }

      await rating.destroy();

      return {
        success: true,
        message: "Rating deleted successfully",
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user's ratings
   */
  async getUserRatings(userId, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      const { count, rows } = await ProjectRating.findAndCountAll({
        where: { userId: userId },
        include: [
          {
            model: Project,
            as: "project",
            attributes: ["id", "name", "projectId"],
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: limit,
        offset: offset,
      });

      return {
        success: true,
        ratings: rows,
        pagination: {
          totalRatings: count,
          totalPages: Math.ceil(count / limit),
          currentPage: page,
          limit: limit,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get top-rated projects
   */
  async getTopRatedProjects(limit = 10) {
    try {
      const topRated = await Project.findAll({
        attributes: {
          include: [
            [
              require("sequelize").sequelize.fn(
                "AVG",
                require("sequelize").sequelize.col("ratings.rating")
              ),
              "averageRating",
            ],
            [
              require("sequelize").sequelize.fn(
                "COUNT",
                require("sequelize").sequelize.col("ratings.id")
              ),
              "totalRatings",
            ],
          ],
        },
        include: [
          {
            model: ProjectRating,
            as: "ratings",
            attributes: [],
            required: false,
          },
        ],
        group: ["Project.id"],
        order: [[require("sequelize").sequelize.literal("averageRating"), "DESC"]],
        limit: limit,
        subQuery: false,
        raw: true,
      });

      return {
        success: true,
        topRatedProjects: topRated,
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new ProjectRatingService();