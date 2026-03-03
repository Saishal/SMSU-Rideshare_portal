const router = require('express').Router();
const { protect } = require('../middleware/authMiddleware');
const { send, conversation } = require('../controllers/messagesController');

router.post('/', protect, send);
router.get('/with/:userId', protect, conversation);

module.exports = router;
