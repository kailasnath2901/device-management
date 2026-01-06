// routes/projects.routes.js
const express = require("express");
const router = express.Router();
const projectController = require("../controllers/projects.controller");
const { authenticate, authorizeRoles } = require("../middleware/auth");
const fileUpload = require("../middleware/fileUpload");
const projectRatingController = require("../controllers/project-rating-controller");

// ============================================
// SPECIFIC ROUTES FIRST (before :projectId)
// ============================================

// Category routes with prefix
router.post("/category/create", authenticate, authorizeRoles("admin", "super_admin"), projectController.createCategory);
router.get("/category/list", authenticate, projectController.getCategories);
router.get("/category/:id", authenticate, projectController.getCategoryById);
router.put("/category/:id/update", authenticate, authorizeRoles("admin", "super_admin"), projectController.updateCategory);
router.delete("/category/:id/delete", authenticate, authorizeRoles("admin", "super_admin"), projectController.deleteCategory);

// Component routes with prefix
router.post("/component/create", authenticate, authorizeRoles("admin", "super_admin"), projectController.createComponent);
router.get("/component/list", authenticate, projectController.getComponents);
router.get("/component/:id", authenticate, projectController.getComponentById);
router.put("/component/:id/update", authenticate, authorizeRoles("admin", "super_admin"), projectController.updateComponent);
router.delete("/component/:id/delete", authenticate, authorizeRoles("admin", "super_admin"), projectController.deleteComponent);

// File operations
router.get("/file/:fileId/download", authenticate, projectController.downloadProjectFile);

// Running projects (SPECIFIC - before /project/:projectId)
router.post("/project/set-running", authenticate, projectController.setRunningProject);
router.get("/project/running", authenticate, projectController.getRunningProject);

// Project user routes (SPECIFIC - before /project/:projectId)
router.get("/project/user/list", authenticate, projectController.getUserProjects);

// User-related routes
router.get("/user/acquired-projects", authenticate, projectController.getAcquiredProjects);
router.get("/user/devices", authenticate, projectController.getUserDevices);

// Search routes (SPECIFIC)
router.get('/search', authenticate, projectController.searchProjects);
router.get('/categories/search', projectController.searchCategories);
router.get('/components/search', projectController.searchComponents);

// ============================================
// GENERIC ROUTES LAST (with :projectId)
// ============================================

// Project routes with prefix
router.post("/project/create", authenticate, authorizeRoles("admin", "super_admin"), fileUpload.uploadFields([{ name: "images", maxCount: 10 }, { name: "files", maxCount: 20 }]), projectController.createProject);
router.put("/project/:projectId/edit", authenticate, fileUpload.uploadFields([{ name: "images", maxCount: 10 }, { name: "files", maxCount: 20 }]), projectController.editProject);
router.post("/project/:projectId/acquire", authenticate, projectController.acquireProject);
router.delete("/project/:projectId/remove-acquisition", authenticate, projectController.removeAcquiredProject);
router.delete("/project/:projectId/delete", authenticate, authorizeRoles("admin", "super_admin"), projectController.deleteProject);

// Generic project routes (LAST because they have :projectId)
router.get("/project/:projectId", authenticate, projectController.getProject);
router.get('/projectId/:projectId', authenticate, projectController.getProjectByProjectId);

// Rating routes
router.post("/:projectId/rate", authenticate, projectRatingController.addRating);
router.get("/:projectId/my-rating", authenticate, projectRatingController.getUserRating);
router.get("/:projectId/ratings", authenticate, projectRatingController.getProjectRatings);
router.get("/:projectId/rating-stats", authenticate, projectRatingController.getRatingStats);
router.delete("/rating/:ratingId", authenticate, projectRatingController.deleteRating);
router.get("/user/my-ratings", authenticate, projectRatingController.getUserRatings);
router.get("/top-rated", authenticate, projectRatingController.getTopRatedProjects);

module.exports = router;