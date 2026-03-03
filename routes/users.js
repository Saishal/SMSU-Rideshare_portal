const router = require('express').Router();
const userCtrl = require('../controllers/usersController');   // <— note: no destructuring
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Auth
router.post('/register', userCtrl.register);
router.post('/login', userCtrl.login);
router.get('/me', protect, userCtrl.me);

// Admin utilities
router.get('/', protect, restrictTo('admin'), userCtrl.list);
router.patch('/:userId/toggle', protect, restrictTo('admin'), userCtrl.toggleActive);
router.patch('/:userId/role', protect, restrictTo('admin'), userCtrl.setRole);

module.exports = router;
