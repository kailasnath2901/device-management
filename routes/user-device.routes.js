const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/user-device.controller');
const { authenticate , authorizeRoles} = require('../middleware/auth');

router.post('/addDevices', 
  authenticate, 
  deviceController.addDevice
);

router.post('/admin/assign-device', 
    authenticate, 
    authorizeRoles('admin' , 'super_admin'), 
    deviceController.assignDeviceToUser
  );

router.get('/getDevices', 
  authenticate, 
  deviceController.getUserDevices
);

router.patch('/devices/:deviceId/firmware', 
  authenticate, 
  authorizeRoles('admin', 'super_admin'),  // Add admin authorization
  deviceController.updateDeviceFirmware
);

router.patch('/devices/:deviceId', 
  authenticate, 
  deviceController.updateDevice
);

router.get('/devices/all', 
  authenticate, 
  authorizeRoles('admin', 'super_admin'), 
  deviceController.getAllDevices
);

module.exports = router;