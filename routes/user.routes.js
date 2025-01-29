const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { checkInitialSetup, performInitialSetup } = require('../services/initial-setup.service');

// Public routes
router.post('/signup', userController.signup);
router.post('/login', userController.login);

// Initial setup route
router.post('/initial-setup', async (req, res) => {
  try {
    // Check if initial setup is already completed
    const isSetupComplete = await checkInitialSetup();
    
    if (isSetupComplete) {
      return res.status(403).json({
        success: false,
        message: "Initial setup has already been completed"
      });
    }

    // Perform initial setup
    const superAdmin = await performInitialSetup(req.body);
    
    res.status(201).json({
      success: true,
      message: "Initial setup completed successfully",
      superAdmin: {
        id: superAdmin.id,
        username: superAdmin.username,
        email: superAdmin.email
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Protected routes
router.get('/getAll', 
  authenticate, 
  authorizeRoles('admin', 'super_admin'), 
  userController.getAllUsers
);

router.put('/:userId/updateRoles', 
  authenticate, 
  authorizeRoles('super_admin'), 
  userController.updateUserRole
);

router.post('/create-admin', 
  authenticate, 
  authorizeRoles('super_admin'), 
  userController.createAdminBySuper
);

router.get('/get-acquired-projects', 
  authenticate, 
  userController.getAcquiredProjects
);

module.exports = router;