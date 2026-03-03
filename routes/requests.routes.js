const router = require('express').Router();
const { protect, restrictTo } = require('../middleware/authMiddleware');
const {
  createRequest,
  myRequests,
  incomingForDriver,
  setStatus
} = require('../controllers/requestsController');

// Student creates a request
router.post('/', protect, restrictTo('student', 'admin'), createRequest);

// Student: list my requests
router.get('/mine', protect, restrictTo('student', 'admin'), myRequests);

// Driver/Admin: incoming requests for my rides
router.get(
  '/incoming',
  protect,
  restrictTo('driver', 'admin'),
  incomingForDriver
);

// Driver/Admin: update status (Accept/Reject)
router.patch(
  '/:id/status',
  protect,
  restrictTo('driver', 'admin'),
  setStatus
);

module.exports = router;

