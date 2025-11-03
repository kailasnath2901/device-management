const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/user-device.controller');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { createDeviceAvatarUpload, handleDeviceAvatarUploadError } = require('../middleware/deviceAvatarUpload');
const deviceProfileController = require('../controllers/user-device-profile.controller');

router.post('/admin/create-device',
  authenticate,
  authorizeRoles('admin', 'super_admin'),
  deviceController.createDeviceByAdmin
);

router.get('/getdevices',
  authenticate,
  deviceController.getDevices
);


router.patch('/Updatedevice/:deviceId',
  authenticate,
  authorizeRoles('admin', 'super_admin'),
  deviceController.updateDevice
);

router.post('/claim', authenticate, deviceController.claimDevice);
router.delete('/remove-claim/:deviceId', authenticate, deviceController.removeClaimedDevice);
router.get('/my-devices', authenticate, deviceController.getUserDevices);
router.get('/is-modified', authenticate, deviceController.getIsModified);

router.delete('/admin/devices/:deviceId',
  authenticate,
  authorizeRoles('admin', 'super_admin'),
  deviceController.deleteDeviceByAdmin
);

// Update device nickname (users can update their own device nicknames)
router.patch('/nickname/:serialNumber',
  authenticate,
  deviceController.updateDeviceNickname
);

// Admin routes for managing device updates
router.post('/admin/mark-updates',
  authenticate,
  authorizeRoles('admin', 'super_admin'),
  deviceController.markDevicesUpdateAvailable
);

router.post('/admin/clear-updates',
  authenticate,
  authorizeRoles('admin', 'super_admin'),
  deviceController.clearDevicesUpdateAvailable
);

// Get devices with updates available (admins see all, users see only their own)
router.get('/updates-available',
  authenticate,
  deviceController.getDevicesWithUpdateAvailable
);

// Update single device update flag
router.patch('/admin/update-flag/:serialNumber',
  authenticate,
  authorizeRoles('admin', 'super_admin'),
  deviceController.updateDeviceUpdateFlag
);

// Get device statistics (admin only)
router.get('/admin/stats',
  authenticate,
  authorizeRoles('admin', 'super_admin'),
  deviceController.getDeviceStats
);

// Check device status by serial number (useful for device setup/claiming flow)
router.get('/status/:serialNumber',
  authenticate,
  deviceController.checkDeviceStatus
);


/**
 * Upload/Update device avatar
 * POST /api/user-devices/:deviceId/avatar/upload
 */
router.post(
  '/:deviceId/avatar/upload',
  authenticate,
  authorizeRoles('admin', 'super_admin'),
  (req, res, next) => createDeviceAvatarUpload(req, res, next),
  handleDeviceAvatarUploadError,
  deviceProfileController.uploadDeviceAvatar
);

/**
 * Get device avatar
 * GET /api/user-devices/:deviceId/avatar
 */
router.get('/:deviceId/avatar', authenticate, deviceProfileController.getDeviceAvatar);

/**
 * Delete device avatar
 * DELETE /api/user-devices/:deviceId/avatar
 */
router.delete(
  '/:deviceId/avatar',
  authenticate,
  authorizeRoles('admin', 'super_admin'),
  deviceProfileController.deleteDeviceAvatar
);

// ============== DEVICE EXTRA DATA ROUTES ==============

/**
 * Update extradata field
 * PUT /api/user-devices/:deviceId/extradata/:fieldName
 */
router.put(
  '/:deviceId/extradata/:fieldName',
  authenticate,
  authorizeRoles('admin', 'super_admin'),
  deviceProfileController.updateExtraData
);

/**
 * Get single extradata field
 * GET /api/user-devices/:deviceId/extradata/:fieldName
 */
router.get('/:deviceId/extradata/:fieldName', authenticate, deviceProfileController.getExtraData);

/**
 * Get all extradata fields
 * GET /api/user-devices/:deviceId/extradata
 */
router.get('/:deviceId/extradata', authenticate, deviceProfileController.getAllExtraData);

/**
 * Delete extradata field
 * DELETE /api/user-devices/:deviceId/extradata/:fieldName
 */
router.delete(
  '/:deviceId/extradata/:fieldName',
  authenticate,
  authorizeRoles('admin', 'super_admin'),
  deviceProfileController.deleteExtraData
);

/**
 * Merge/Update nested data in extradata field
 * PATCH /api/user-devices/:deviceId/extradata/:fieldName/merge
 */
router.patch(
  '/:deviceId/extradata/:fieldName/merge',
  authenticate,
  authorizeRoles('admin', 'super_admin'),
  deviceProfileController.mergeExtraData
);



module.exports = router;
