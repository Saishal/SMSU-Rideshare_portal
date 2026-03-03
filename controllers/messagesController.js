const Message = require('../models/Message');

exports.send = async (req, res, next) => {
  try {
    const { to, rideId, content } = req.body;
    if (!to || !content) return res.status(400).json({ message: 'Missing recipient or content' });
    const msg = await Message.create({ sender: req.user.id, receiver: to, ride: rideId, content });
    res.status(201).json({ success: true, data: msg });
  } catch (e) { next(e); }
};

exports.conversation = async (req, res, next) => {
  try {
    const otherId = req.params.userId;
    const msgs = await Message.find({
      $or: [
        { sender: req.user.id, receiver: otherId },
        { sender: otherId, receiver: req.user.id }
      ]
    }).sort({ createdAt: 1 });
    res.json({ success: true, data: msgs });
  } catch (e) { next(e); }
};
