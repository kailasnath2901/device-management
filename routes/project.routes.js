// routes/projects.routes.js
const express = require("express");
const router = express.Router();
const projectController = require("../controllers/projects.controller");
const { authenticate, authorizeRoles } = require("../middleware/auth");
const fileUpload = require("../middleware/fileUpload");


// Alternative routing structure with more explicit paths:

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

// Project routes with prefix
router.post("/project/create", authenticate, authorizeRoles("admin", "super_admin"), fileUpload.uploadFields([{ name: "images", maxCount: 10 }, { name: "files", maxCount: 20 }]), projectController.createProject);
router.put("/project/:projectId/edit", authenticate, fileUpload.uploadFields([{ name: "images", maxCount: 10 }, { name: "files", maxCount: 20 }]), projectController.editProject);
router.get("/project/:projectId", authenticate, projectController.getProject);
router.get('/search', authenticate, projectController.searchProjects);
router.get("/project/user/list", authenticate, projectController.getUserProjects);
router.delete("/project/:projectId/delete", authenticate, authorizeRoles("admin", "super_admin"), projectController.deleteProject);

// File and acquisition routes
router.get("/file/:fileId/download", authenticate, projectController.downloadProjectFile);
router.post("/project/:projectId/acquire", authenticate, projectController.acquireProject);
router.delete("/project/:projectId/remove-acquisition", authenticate, projectController.removeAcquiredProject);
router.get("/user/acquired-projects", authenticate, projectController.getAcquiredProjects);
router.get("/user/devices", authenticate, projectController.getUserDevices);




module.exports = router;