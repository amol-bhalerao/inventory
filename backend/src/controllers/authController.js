// Auth Controller - Authentication Logic
const User = require('../models/User');
const { comparePassword, hashPassword } = require('../utils/helpers');
const { generateToken, generateRefreshToken } = require('../middleware/auth');
const { sendSuccess, sendError } = require('../utils/response');

// Register a new user
exports.register = async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, phone, franchiseId, roleId } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return sendError(res, 'Username, email, and password are required', 400);
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return sendError(res, 'Email already registered', 409);
    }

    // Create new user
    const user = await User.create({
      franchiseId,
      roleId,
      username,
      email,
      password,
      firstName,
      lastName,
      phone
    });

    // Generate tokens
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      franchiseId: user.franchiseId
    });

    const refreshToken = generateRefreshToken({
      id: user.id,
      email: user.email
    });

    sendSuccess(res, 'User registered successfully', {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      },
      token,
      refreshToken
    }, 201);
  } catch (error) {
    console.error('Registration error:', error);
    sendError(res, error.message || 'Registration failed', 500);
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 'Email and password are required', 400);
    }

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return sendError(res, 'Invalid email or password', 401);
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      return sendError(res, 'Invalid email or password', 401);
    }

    // Verify user is active
    if (!user.is_active) {
      return sendError(res, 'User account is inactive', 403);
    }

    // Generate tokens
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      franchiseId: user.franchise_id
    });

    const refreshToken = generateRefreshToken({
      id: user.id,
      email: user.email
    });

    // Update last login
    await User.update(user.id, { lastLogin: new Date() });

    sendSuccess(res, 'Login successful', {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        franchiseId: user.franchise_id,
        franchise: user.franchise
      },
      token,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    sendError(res, error.message || 'Login failed', 500);
  }
};

// Logout user
exports.logout = (req, res) => {
  try {
    // In a real application, you might want to blacklist the token
    // For now, we just return success
    sendSuccess(res, 'Logout successful');
  } catch (error) {
    sendError(res, error.message || 'Logout failed', 500);
  }
};

// Get current user profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    sendSuccess(res, 'Profile retrieved successfully', {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      role: user.role,
      franchiseId: user.franchise_id,
      franchise: user.franchise,
      lastLogin: user.last_login,
      isActive: user.is_active
    });
  } catch (error) {
    console.error('Get profile error:', error);
    sendError(res, error.message || 'Failed to get profile', 500);
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return sendError(res, 'Old password and new password are required', 400);
    }

    if (newPassword !== confirmPassword) {
      return sendError(res, 'Passwords do not match', 400);
    }

    if (newPassword.length < 6) {
      return sendError(res, 'Password must be at least 6 characters', 400);
    }

    // Get user with password hash
    const user = await User.findById(userId);
    
    // Verify old password
    const isPasswordValid = await comparePassword(oldPassword, user.password_hash);
    if (!isPasswordValid) {
      return sendError(res, 'Current password is incorrect', 401);
    }

    // Update password
    await User.update(userId, { password: newPassword });

    sendSuccess(res, 'Password changed successfully');
  } catch (error) {
    console.error('Change password error:', error);
    sendError(res, error.message || 'Failed to change password', 500);
  }
};

// Refresh Token
exports.refreshToken = (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return sendError(res, 'Refresh token is required', 400);
    }

    // In a real app, verify the refresh token
    // For now, we'll generate new tokens
    const newAccessToken = generateToken({
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      franchiseId: req.user.franchiseId
    });

    const newRefreshToken = generateRefreshToken({
      id: req.user.id,
      email: req.user.email
    });

    sendSuccess(res, 'Token refreshed successfully', {
      token: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    sendError(res, error.message || 'Failed to refresh token', 500);
  }
};
