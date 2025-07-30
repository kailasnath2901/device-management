const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { checkInitialSetup, performInitialSetup } = require('../services/initial-setup.service');

// Public routes
router.post('/signup', userController.signup);
router.post('/login', userController.login);

// OTP routes (public)
router.post('/verify-email', userController.verifyEmail);
router.post('/resend-verification-otp', userController.resendVerificationOTP);
router.post('/request-login-otp', userController.requestLoginOTP);
router.post('/login-with-otp', userController.loginWithOTP);

// NEW: Password reset routes (public - no authentication required)
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);

// Initial setup route (public)
router.post('/initial-setup', async (req, res) => {
  try {
    const isSetupComplete = await checkInitialSetup();
    
    if (isSetupComplete) {
      return res.status(403).json({
        success: false,
        message: "Initial setup has already been completed"
      });
    }

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

// Protected routes (require authentication)

// NEW: Change password (requires auth token in header, no additional token needed)
router.put('/change-password', 
  authenticate, 
  userController.changePassword
);

// User management routes
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

// NEW: Delete user route (admin can delete users, super_admin can delete admin and users)
router.delete('/:userId', 
  authenticate, 
  authorizeRoles('admin', 'super_admin'), 
  userController.deleteUser
);

// User projects route
router.get('/get-acquired-projects', 
  authenticate, 
  userController.getAcquiredProjects
);

module.exports = router;