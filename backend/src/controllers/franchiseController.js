// Franchise Controller
const Franchise = require('../models/Franchise');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/response');

// Create a new franchise
exports.create = async (req, res) => {
  try {
    const { name, appName, email, phone, address, city, state, country, postalCode } = req.body;

    if (!name || !email) {
      return sendError(res, 'Franchise name and email are required', 400);
    }

    const franchise = await Franchise.create({
      name,
      appName,
      email,
      phone,
      address,
      city,
      state,
      country,
      postalCode
    });

    sendSuccess(res, 'Franchise created successfully', franchise, 201);
  } catch (error) {
    console.error('Create franchise error:', error);
    sendError(res, error.message || 'Failed to create franchise', 500);
  }
};

// Get all franchises (Super Admin only)
exports.getAll = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const franchises = await Franchise.findAll(limit, offset);

    sendSuccess(res, 'Franchises retrieved successfully', {
      franchises,
      limit,
      offset
    });
  } catch (error) {
    console.error('Get franchises error:', error);
    sendError(res, error.message || 'Failed to get franchises', 500);
  }
};

// Get franchise by ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const franchise = await Franchise.findById(id);
    
    if (!franchise) {
      return sendError(res, 'Franchise not found', 404);
    }

    const userCount = await Franchise.countUsers(id);

    sendSuccess(res, 'Franchise retrieved successfully', {
      ...franchise,
      userCount
    });
  } catch (error) {
    console.error('Get franchise error:', error);
    sendError(res, error.message || 'Failed to get franchise', 500);
  }
};

// Update franchise
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const franchise = await Franchise.update(id, updates);

    if (!franchise) {
      return sendError(res, 'Franchise not found', 404);
    }

    sendSuccess(res, 'Franchise updated successfully', franchise);
  } catch (error) {
    console.error('Update franchise error:', error);
    sendError(res, error.message || 'Failed to update franchise', 500);
  }
};

// Delete franchise
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const franchise = await Franchise.findById(id);
    
    if (!franchise) {
      return sendError(res, 'Franchise not found', 404);
    }

    await Franchise.delete(id);

    sendSuccess(res, 'Franchise deleted successfully');
  } catch (error) {
    console.error('Delete franchise error:', error);
    sendError(res, error.message || 'Failed to delete franchise', 500);
  }
};

// Change franchise app name (whitelabel)
exports.changeAppName = async (req, res) => {
  try {
    const { id } = req.params;
    const { appName } = req.body;

    if (!appName) {
      return sendError(res, 'App name is required', 400);
    }

    const franchise = await Franchise.update(id, { appName });

    if (!franchise) {
      return sendError(res, 'Franchise not found', 404);
    }

    sendSuccess(res, 'App name changed successfully', franchise);
  } catch (error) {
    console.error('Change app name error:', error);
    sendError(res, error.message || 'Failed to change app name', 500);
  }
};
