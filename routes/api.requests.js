const router = require('express').Router();
const { protect, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/requests.controller');

router.post('/', protect, requireRole(['student', 'admin']), ctrl.createRequest);
router.get('/my', protect, requireRole(['student', 'admin']), ctrl.myRequests);
router.get('/incoming', protect, requireRole(['driver', 'admin']), ctrl.incomingForDriver);
router.patch('/:id', protect, requireRole(['driver', 'admin']), ctrl.setStatus);
router.delete('/:id', protect, requireRole(['student', 'admin']), ctrl.cancelRequest);

module.exports = router;
