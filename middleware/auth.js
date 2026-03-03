const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Reads JWT from cookie and populates req.user (used globally)
exports.protect = async (req, res, next) => {
  try {
    const token = req.cookies.authToken;
    if (!token) { req.user = null; return next(); }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    const user = await User.findById(decoded.id).lean();

    if (!user || !user.isActive) { req.user = null; return next(); }

    req.user = { id: user._id, fullName: user.fullName, email: user.email, role: user.role };
    next();
  } catch (err) {
    req.user = null;
    next();
  }
};

// Middleware factory – pass array of allowed roles
exports.requireRole = (roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Login required' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
  next();
};
