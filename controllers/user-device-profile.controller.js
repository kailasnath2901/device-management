// controllers/device-profile.controller.js
const deviceProfileService = require("../services/user-device.service");


/**
 * Upload device avatar
 * POST /api/user-devices/:deviceId/avatar/upload
 */
exports.uploadDeviceAvatar = async (req, res) => {
  try {
    const { deviceId } = req.params;

    // Only admins can upload device avatars
    if (req.user.role !== "admin" && req.user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can upload device avatars",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file provided"
      });
    }

    const result = await deviceProfileService.uploadDeviceAvatar(deviceId, req.file);

    res.status(200).json({
      success: true,
      message: result.message,
      deviceAvatar: result.deviceAvatar,
      publicUrl: result.publicUrl  // ✅ Full URL - same as user profile
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get device avatar
 * GET /api/user-devices/:deviceId/avatar
 */
exports.getDeviceAvatar = async (req, res) => {
  try {
    const { deviceId } = req.params;

    const result = await deviceProfileService.getDeviceAvatar(deviceId);

    res.json({
      success: result.success,
      message: result.message,
      deviceAvatar: result.deviceAvatar,
      publicUrl: result.publicUrl  // ✅ Full URL - same as user profile
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Delete device avatar
 * DELETE /api/user-devices/:deviceId/avatar
 */
exports.deleteDeviceAvatar = async (req, res) => {
  try {
    const { deviceId } = req.params;

    // Only admins can delete device avatars
    if (req.user.role !== "admin" && req.user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can delete device avatars",
      });
    }

    const result = await deviceProfileService.deleteDeviceAvatar(deviceId);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ============== EXTRA DATA ENDPOINTS ==============

/**
 * Update extradata field
 * PUT /api/user-devices/:deviceId/extradata/:fieldName
 */
exports.updateExtraData = async (req, res) => {
  try {
    const { deviceId, fieldName } = req.params;
    const { data } = req.body;

    // Only admins can update device extradata
    if (req.user.role !== "admin" && req.user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can update device data",
      });
    }

    if (data === undefined) {
      return res.status(400).json({
        success: false,
        message: "Data field is required",
      });
    }

    const result = await deviceProfileService.updateExtraData(deviceId, fieldName, data);

    res.json({
      success: true,
      message: result.message,
      [fieldName]: result[fieldName],
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get single extradata field
 * GET /api/user-devices/:deviceId/extradata/:fieldName
 */
exports.getExtraData = async (req, res) => {
  try {
    const { deviceId, fieldName } = req.params;

    const result = await deviceProfileService.getExtraData(deviceId, fieldName);

    res.json({
      success: true,
      [fieldName]: result[fieldName],
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get all extradata fields
 * GET /api/user-devices/:deviceId/extradata
 */
exports.getAllExtraData = async (req, res) => {
  try {
    const { deviceId } = req.params;

    const result = await deviceProfileService.getAllExtraData(deviceId);

    res.json({
      success: true,
      extradata1: result.extradata1,
      extradata2: result.extradata2,
      extradata3: result.extradata3,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Delete extradata field
 * DELETE /api/user-devices/:deviceId/extradata/:fieldName
 */
exports.deleteExtraData = async (req, res) => {
  try {
    const { deviceId, fieldName } = req.params;

    // Only admins can delete device extradata
    if (req.user.role !== "admin" && req.user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can delete device data",
      });
    }

    const result = await deviceProfileService.deleteExtraData(deviceId, fieldName);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Merge/Update nested data in extradata field
 * PATCH /api/user-devices/:deviceId/extradata/:fieldName/merge
 */
exports.mergeExtraData = async (req, res) => {
  try {
    const { deviceId, fieldName } = req.params;
    const { data } = req.body;

    // Only admins can merge device extradata
    if (req.user.role !== "admin" && req.user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can update device data",
      });
    }

    if (!data || typeof data !== "object") {
      return res.status(400).json({
        success: false,
        message: "Data field is required and must be an object",
      });
    }

    const result = await deviceProfileService.mergeExtraData(deviceId, fieldName, data);

    res.json({
      success: true,
      message: result.message,
      [fieldName]: result[fieldName],
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};