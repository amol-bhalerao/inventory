// User Management Controller
const User = require('../models/User');
const Franchise = require('../models/Franchise');
const { sendSuccess, sendError } = require('../utils/response');

// Create a user
exports.create = async (req, res) => {
  try {
    const { firstname, lastname, email, password, franchiseId, role, phone } = req.body;

    // Validate input
    if (!firstname || !lastname || !email || !password || !franchiseId || !role) {
      return sendError(res, 'Required fields missing', 400);
    }

    // Check if user exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return sendError(res, 'Email already in use', 409);
    }

    // Convert role name to roleId
    const roleId = await User.getRoleIdByName(role);
    if (!roleId) {
      return sendError(res, 'Invalid role specified', 400);
    }

    // Generate username from firstname and lastname
    const generatedUsername = `${firstname.substring(0, 1)}${lastname}`.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Create user
    const user = await User.create({
      franchiseId,
      roleId,
      username: generatedUsername,
      email,
      password,
      firstName: firstname,
      lastName: lastname,
      phone
    });

    sendSuccess(res, 'User created successfully', {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: role
    }, 201);
  } catch (error) {
    console.error('Create user error:', error);
    sendError(res, error.message || 'Failed to create user', 500);
  }
};

// Get all users (Super Admin only)
exports.getAll = async (req, res) => {
  try {
    const users = await User.getAll();
    sendSuccess(res, 'All users retrieved successfully', { users });
  } catch (error) {
    console.error('Get all users error:', error);
    sendError(res, error.message || 'Failed to get users', 500);
  }
};

// Get users by franchise
exports.getByFranchise = async (req, res) => {
  try {
    const { franchiseId } = req.params;

    const users = await User.findByFranchise(franchiseId);

    sendSuccess(res, 'Users retrieved successfully', { users });
  } catch (error) {
    console.error('Get users error:', error);
    sendError(res, error.message || 'Failed to get users', 500);
  }
};

// Get user by ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    // Remove sensitive data
    delete user.password_hash;

    sendSuccess(res, 'User retrieved successfully', user);
  } catch (error) {
    console.error('Get user error:', error);
    sendError(res, error.message || 'Failed to get user', 500);
  }
};

// Update user
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstname, lastname, email, phone, role, password, franchiseId, status } = req.body;

    const updateData = {};

    // Map frontend field names to model field names
    if (firstname) updateData.firstName = firstname;
    if (lastname) updateData.lastName = lastname;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (franchiseId) updateData.franchiseId = franchiseId;
    if (status !== undefined) updateData.isActive = status === 'active' ? 1 : 0;

    // Convert role name to roleId if provided
    if (role) {
      const roleId = await User.getRoleIdByName(role);
      if (!roleId) {
        return sendError(res, 'Invalid role specified', 400);
      }
      updateData.roleId = roleId;
    }

    // Only include password if provided and not empty
    if (password && password.trim()) {
      updateData.password = password;
    }

    // Only update if there's data to update
    if (Object.keys(updateData).length === 0) {
      return sendError(res, 'No fields to update', 400);
    }

    const updatedUser = await User.update(id, updateData);

    if (!updatedUser) {
      return sendError(res, 'User not found', 404);
    }

    delete updatedUser.password_hash;

    sendSuccess(res, 'User updated successfully', updatedUser);
  } catch (error) {
    console.error('Update user error:', error);
    sendError(res, error.message || 'Failed to update user', 500);
  }
};

// Delete user
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    await User.delete(id);

    sendSuccess(res, 'User deleted successfully');
  } catch (error) {
    console.error('Delete user error:', error);
    sendError(res, error.message || 'Failed to delete user', 500);
  }
};

// Deactivate user
exports.deactivate = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.update(id, { isActive: false });

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    sendSuccess(res, 'User deactivated successfully');
  } catch (error) {
    console.error('Deactivate user error:', error);
    sendError(res, error.message || 'Failed to deactivate user', 500);
  }
};

// Activate user
exports.activate = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.update(id, { isActive: true });

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    sendSuccess(res, 'User activated successfully');
  } catch (error) {
    console.error('Activate user error:', error);
    sendError(res, error.message || 'Failed to activate user', 500);
  }
};
