// Authorization Middleware - Role-based access control
const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Super Admin has access to everything
    if (req.user.role === 'Super Admin') {
      next();
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }

    next();
  };
};

const authorizeFranchise = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  // Super Admin can access all franchises
  if (req.user.role === 'Super Admin') {
    next();
    return;
  }

  // Other users can only access their own franchise
  const franchiseId = parseInt(req.params.franchiseId) || req.body.franchiseId;
  if (franchiseId && franchiseId !== req.user.franchiseId) {
    return res.status(403).json({ message: 'Access denied. You can only access your own franchise.' });
  }

  next();
};

module.exports = {
  authorizeRole,
  authorizeFranchise
};
