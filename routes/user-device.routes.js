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

module.exports = router;
