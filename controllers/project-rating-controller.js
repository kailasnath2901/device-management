const ProjectRatingService = require("../services/project-rating.services");

class ProjectRatingController {
  /**
   * Add or update rating
   * POST /api/projects/:projectId/rate
   */
  async addRating(req, res) {
    try {
      const { projectId } = req.params;
      const { rating, review } = req.body;
      const userId = req.user.id;

      // Validate inputs
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: "Rating must be between 1 and 5",
        });
      }

      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: "Project ID is required",
        });
      }

      // Validate review length if provided
      if (review && review.length > 1000) {
        return res.status(400).json({
          success: false,
          message: "Review cannot exceed 1000 characters",
        });
      }

      const result = await ProjectRatingService.addRating(
        userId,
        parseInt(projectId),
        parseInt(rating),
        review || null
      );

      res.status(result.isNew ? 201 : 200).json({
        success: true,
        message: result.message,
        isNew: result.isNew,
        rating: result.rating,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get user's rating for a project
   * GET /api/projects/:projectId/my-rating
   */
  async getUserRating(req, res) {
    try {
      const { projectId } = req.params;
      const userId = req.user.id;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: "Project ID is required",
        });
      }

      const result = await ProjectRatingService.getUserRating(
        userId,
        parseInt(projectId)
      );

      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get all ratings for a project
   * GET /api/projects/:projectId/ratings
   */
  async getProjectRatings(req, res) {
    try {
      const { projectId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: "Project ID is required",
        });
      }

      const result = await ProjectRatingService.getProjectRatings(
        parseInt(projectId),
        parseInt(page),
        parseInt(limit)
      );

      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get rating statistics for a project
   * GET /api/projects/:projectId/rating-stats
   */
  async getRatingStats(req, res) {
    try {
      const { projectId } = req.params;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: "Project ID is required",
        });
      }

      const stats = await ProjectRatingService.getRatingStats(
        parseInt(projectId)
      );

      res.json({
        success: true,
        stats: stats,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Delete a rating
   * DELETE /api/projects/rating/:ratingId
   */
  async deleteRating(req, res) {
    try {
      const { ratingId } = req.params;
      const userId = req.user.id;

      if (!ratingId) {
        return res.status(400).json({
          success: false,
          message: "Rating ID is required",
        });
      }

      const result = await ProjectRatingService.deleteRating(
        userId,
        parseInt(ratingId)
      );

      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get user's ratings
   * GET /api/projects/user/my-ratings
   */
  async getUserRatings(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10 } = req.query;

      const result = await ProjectRatingService.getUserRatings(
        userId,
        parseInt(page),
        parseInt(limit)
      );

      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get top-rated projects
   * GET /api/projects/top-rated
   */
  async getTopRatedProjects(req, res) {
    try {
      const { limit = 10 } = req.query;

      const result = await ProjectRatingService.getTopRatedProjects(
        parseInt(limit)
      );

      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}

module.exports = new ProjectRatingController();