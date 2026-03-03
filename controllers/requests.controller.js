const Ride = require('../models/Ride');
const RideRequest = require('../models/RideRequest');

// POST /api/requests - student requests a ride
exports.createRequest = async (req, res, next) => {
  try {
    const { rideId, message } = req.body;

    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    // prevent duplicate
    const existing = await RideRequest.findOne({ ride: rideId, student: req.user.id });
    if (existing) return res.status(400).json({ message: 'You have already requested this ride.' });

    // check seats available
    if (ride.availableSeats <= 0) {
      return res.status(400).json({ message: 'No seats available for this ride.' });
    }

    const rr = await RideRequest.create({ ride: rideId, student: req.user.id, message });
    res.status(201).json({ success: true, data: rr });
  } catch (err) { next(err); }
};

// GET /api/requests/my - student views their requests
exports.myRequests = async (req, res, next) => {
  try {
    const list = await RideRequest.find({ student: req.user.id })
      .populate({ path: 'ride', populate: { path: 'driver', select: 'fullName email' } })
      .sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (err) { next(err); }
};

// GET /api/requests/incoming - driver views requests for their rides
exports.incomingForDriver = async (req, res, next) => {
  try {
    // get driver's ride IDs first
    const myRideIds = (await Ride.find({ driver: req.user.id }, '_id')).map(r => r._id);
    const all = await RideRequest.find({ ride: { $in: myRideIds } })
      .populate('ride')
      .populate('student', 'fullName email')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: all });
  } catch (err) { next(err); }
};

// PATCH /api/requests/:id - driver accepts/rejects (atomic seat update)
exports.setStatus = async (req, res, next) => {
  try {
    const { status } = req.body; // "Accepted" or "Rejected"
    const rr = await RideRequest.findById(req.params.id).populate('ride');
    if (!rr) return res.status(404).json({ message: 'Request not found' });

    if (rr.ride.driver.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (status === 'Accepted' && rr.status !== 'Accepted') {
      // Atomic seat decrement — only succeed if seats > 0
      const updated = await Ride.findOneAndUpdate(
        { _id: rr.ride._id, availableSeats: { $gt: 0 } },
        { $inc: { availableSeats: -1 } },
        { new: true }
      );
      if (!updated) {
        return res.status(400).json({ message: 'No available seats remaining (already taken).' });
      }
    }

    if (status === 'Rejected' && rr.status === 'Accepted') {
      // Give seat back if un-accepting
      await Ride.findByIdAndUpdate(rr.ride._id, { $inc: { availableSeats: 1 } });
    }

    rr.status = status;
    await rr.save();

    res.json({ success: true, data: rr });
  } catch (err) { next(err); }
};

// DELETE /api/requests/:id - student cancels their own request
exports.cancelRequest = async (req, res, next) => {
  try {
    const rr = await RideRequest.findById(req.params.id);
    if (!rr) return res.status(404).json({ message: 'Request not found' });
    if (rr.student.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    // if accepted, restore seat
    if (rr.status === 'Accepted') {
      await Ride.findByIdAndUpdate(rr.ride, { $inc: { availableSeats: 1 } });
    }
    await rr.deleteOne();
    res.json({ success: true });
  } catch (err) { next(err); }
};
