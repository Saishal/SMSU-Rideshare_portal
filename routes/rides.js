const router = require('express').Router();
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { getRides, getRide, createRide, updateRide, deleteRide } = require('../controllers/ridesController');

// Public reads
router.get('/', getRides);
router.get('/:id', getRide);

// Driver/Admin writes
router.post('/', protect, restrictTo('driver', 'admin'), createRide);
router.put('/:id', protect, restrictTo('driver', 'admin'), updateRide);
router.delete('/:id', protect, restrictTo('driver', 'admin'), deleteRide);

module.exports = router;
