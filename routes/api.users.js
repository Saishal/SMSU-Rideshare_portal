const router = require('express').Router();
const { protect, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/users.controller');

router.get('/', protect, requireRole(['admin']), ctrl.list);
router.patch('/:id/toggle-active', protect, requireRole(['admin']), ctrl.toggleActive);
router.patch('/:id/role', protect, requireRole(['admin']), ctrl.setRole);

module.exports = router;
