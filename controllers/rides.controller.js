const Ride = require('../models/Ride');

// GET /api/rides?destination=&date= - browse available rides
exports.getAllRides = async (req, res, next) => {
  try {
    const { destination, date, seats } = req.query;
    const filter = { availableSeats: { $gt: 0 } };

    if (destination) filter.destination = new RegExp(destination, 'i');
    if (date) {
      const start = new Date(date); start.setHours(0,0,0,0);
      const end = new Date(date); end.setHours(23,59,59,999);
      filter.departureTime = { $gte: start, $lte: end };
    }
    if (seats) filter.availableSeats = { $gte: parseInt(seats) };

    const rides = await Ride.find(filter)
      .populate('driver', 'fullName email')
      .sort({ departureTime: 1 });

    res.json({ success: true, data: rides });
  } catch (err) { next(err); }
};

// GET /api/rides/my - driver's own rides
exports.myRides = async (req, res, next) => {
  try {
    const rides = await Ride.find({ driver: req.user.id }).sort({ departureTime: -1 });
    res.json({ success: true, data: rides });
  } catch (err) { next(err); }
};

// POST /api/rides
exports.createRide = async (req, res, next) => {
  try {
    const { destination, departureLocation, departureTime, availableSeats, vehicleInfo, notes } = req.body;
    if (!destination || !departureLocation || !departureTime) {
      return res.status(400).json({ message: 'destination, departureLocation and departureTime are required.' });
    }
    const ride = await Ride.create({
      driver: req.user.id,
      destination,
      departureLocation,
      departureTime: new Date(departureTime),
      availableSeats: availableSeats || 1,
      vehicleInfo,
      notes,
    });
    res.status(201).json({ success: true, data: ride });
  } catch (err) { next(err); }
};

// DELETE /api/rides/:id
exports.deleteRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.driver.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    await ride.deleteOne();
    res.json({ success: true });
  } catch (err) { next(err); }
};
