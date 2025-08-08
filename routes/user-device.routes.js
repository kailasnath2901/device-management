const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/user-device.controller');
const { authenticate , authorizeRoles} = require('../middleware/auth');

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

module.exports = router;
