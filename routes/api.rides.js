const router = require('express').Router();
const { protect, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/rides.controller');

router.get('/', ctrl.getAllRides);
router.get('/my', protect, requireRole(['driver', 'admin']), ctrl.myRides);
router.post('/', protect, requireRole(['driver', 'admin']), ctrl.createRide);
router.delete('/:id', protect, requireRole(['driver', 'admin']), ctrl.deleteRide);

module.exports = router;
