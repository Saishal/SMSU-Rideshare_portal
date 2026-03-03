const User = require('../models/User');

// GET /api/users - admin: list all users
exports.list = async (req, res, next) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
};

// PATCH /api/users/:id/toggle-active - admin: activate/deactivate
exports.toggleActive = async (req, res, next) => {
  try {
    if (req.user.id.toString() === req.params.id) {
      return res.status(400).json({ message: 'Cannot deactivate yourself.' });
    }
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ message: 'User not found' });
    u.isActive = !u.isActive;
    await u.save();
    res.json({ success: true, data: { id: u._id, isActive: u.isActive } });
  } catch (err) { next(err); }
};

// PATCH /api/users/:id/role - admin: change role
exports.setRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['student', 'driver', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role.' });
    }
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ message: 'User not found' });
    u.role = role;
    await u.save();
    res.json({ success: true, data: { id: u._id, role: u.role } });
  } catch (err) { next(err); }
};
