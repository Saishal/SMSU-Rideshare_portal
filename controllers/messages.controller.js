const Message = require('../models/Message');

// POST /api/messages - send a message
exports.sendMessage = async (req, res, next) => {
  try {
    const { receiverId, rideId, content } = req.body;
    if (!receiverId || !content) {
      return res.status(400).json({ message: 'receiverId and content are required.' });
    }
    const msg = await Message.create({
      sender: req.user.id,
      receiver: receiverId,
      ride: rideId || null,
      content,
    });
    res.status(201).json({ success: true, data: msg });
  } catch (err) { next(err); }
};

// GET /api/messages/thread/:userId - messages between logged-in user and another
exports.getThread = async (req, res, next) => {
  try {
    const other = req.params.userId;
    const msgs = await Message.find({
      $or: [
        { sender: req.user.id, receiver: other },
        { sender: other, receiver: req.user.id },
      ],
    })
      .populate('sender', 'fullName')
      .populate('receiver', 'fullName')
      .sort({ createdAt: 1 });

    res.json({ success: true, data: msgs });
  } catch (err) { next(err); }
};

// GET /api/messages/inbox - get latest message per conversation
exports.inbox = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const msgs = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
    })
      .populate('sender', 'fullName')
      .populate('receiver', 'fullName')
      .sort({ createdAt: -1 })
      .limit(50);

    // dedupe by conversation partner
    const seen = new Set();
    const threads = [];
    for (const m of msgs) {
      const partnerId = m.sender._id.toString() === userId.toString()
        ? m.receiver._id.toString()
        : m.sender._id.toString();
      if (!seen.has(partnerId)) {
        seen.add(partnerId);
        threads.push(m);
      }
    }
    res.json({ success: true, data: threads });
  } catch (err) { next(err); }
};
