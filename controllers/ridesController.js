const Ride = require('../models/Ride');

exports.getRides = async (req, res, next) => {
  try {
    const { destination } = req.query;
    const q = {};
    if (destination) q.destination = { $regex: destination, $options: 'i' };
    const rides = await Ride.find(q).populate('driver', 'name email role');
    res.json({ success: true, data: rides });
  } catch (e) { next(e); }
};

exports.getRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id).populate('driver', 'name email role');
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    res.json({ success: true, data: ride });
  } catch (e) { next(e); }
};

exports.createRide = async (req, res, next) => {
  try {
    const body = { ...req.body, driver: req.user.id };
    const ride = await Ride.create(body);
    res.status(201).json({ success: true, data: ride });
  } catch (e) { next(e); }
};

exports.updateRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.driver.toString() !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Forbidden' });
    Object.assign(ride, req.body);
    await ride.save();
    res.json({ success: true, data: ride });
  } catch (e) { next(e); }
};

exports.deleteRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.driver.toString() !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Forbidden' });
    await ride.deleteOne();
    res.json({ success: true });
  } catch (e) { next(e); }
};
