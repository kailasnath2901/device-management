// routes/projects.routes.js
const express = require("express");
const router = express.Router();
const projectController = require("../controllers/projects.controller");
const { authenticate, authorizeRoles } = require("../middleware/auth");
const fileUpload = require("../middleware/fileUpload");

// Use the new middleware chain
router.post(
  "/createProject",
  authenticate,
  authorizeRoles('admin', 'super_admin'),
  fileUpload.uploadFields([
    { name: 'image', maxCount: 1 },
    { name: 'files', maxCount: 5 }
  ]),
  projectController.createProject
);

// Other routes remain the same
router.get("/getprojects", authenticate, projectController.getUserProjects);
router.delete('/deleteProject/:projectId', authenticate, authorizeRoles('admin', 'super_admin'), projectController.deleteProject);
router.get('/download/:fileId', authenticate, projectController.downloadProjectFile);
router.post('/acquireProject/:projectId', authenticate, projectController.acquireProject);
router.delete('/remove-acquiredProject/:projectId', authenticate, projectController.removeAcquiredProject);
router.get('/getAllacquired-projects', authenticate, projectController.getAcquiredProjects);

module.exports = router;