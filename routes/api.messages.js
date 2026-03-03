const router = require('express').Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/messages.controller');

router.post('/', protect, ctrl.sendMessage);
router.get('/inbox', protect, ctrl.inbox);
router.get('/thread/:userId', protect, ctrl.getThread);

module.exports = router;
