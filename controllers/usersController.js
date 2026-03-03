const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || '7d'
  });

async function register(req, res, next) {
  try {
    const { name, email, password, role } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });
    const user = await User.create({ name, email, password, role });
    const token = signToken(user);
    res.status(201).json({ token, user: { id: user._id, name, email, role: user.role } });
  } catch (e) { next(e); }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password)))
      return res.status(400).json({ message: 'Invalid credentials' });
    if (!user.isActive) return res.status(403).json({ message: 'Account inactive' });
    const token = signToken(user);
    res.json({ token, user: { id: user._id, name: user.name, email, role: user.role } });
  } catch (e) { next(e); }
}

async function me(req, res, next) {
  try {
    const u = await User.findById(req.user.id);
    res.json({ id: u._id, name: u.name, email: u.email, role: u.role, isActive: u.isActive });
  } catch (e) { next(e); }
}

async function list(req, res, next) {
  try {
    const users = await User.find().sort({ role: -1, name: 1 });
    res.json({ success: true, data: users });
  } catch (e) { next(e); }
}

async function toggleActive(req, res, next) {
  try {
    if (req.user.id === req.params.userId)
      return res.status(400).json({ message: 'Cannot deactivate self' });
    const u = await User.findById(req.params.userId);
    if (!u) return res.status(404).json({ message: 'User not found' });
    u.isActive = !u.isActive;
    await u.save();
    res.json({ success: true, data: { id: u._id, isActive: u.isActive } });
  } catch (e) { next(e); }
}

async function setRole(req, res, next) {
  try {
    const { role } = req.body; // 'student' | 'driver' | 'admin'
    const u = await User.findById(req.params.userId);
    if (!u) return res.status(404).json({ message: 'User not found' });
    u.role = role;
    await u.save();
    res.json({ success: true, data: { id: u._id, role: u.role } });
  } catch (e) { next(e); }
}

module.exports = { register, login, me, list, toggleActive, setRole };
