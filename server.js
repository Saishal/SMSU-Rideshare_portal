// server.js — Mustang RideShare (Semester 2 — full feature build)

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config();
const { connectDB } = require('./config/db');
connectDB();

const User = require('./models/User');
const Ride = require('./models/Ride');
const RideRequest = require('./models/RideRequest');
const Message = require('./models/Message');
const { protect, requireRole } = require('./middleware/auth');

const app = express();

/* --- VIEW ENGINE --- */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/* --- STATIC --- */
app.use(express.static(path.join(__dirname, 'public')));
app.get('/styles.css', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'css', 'style.css'))
);

/* --- SECURITY MIDDLEWARE --- */
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));
app.use(hpp());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

/* --- ATTACH req.user FROM JWT GLOBALLY --- */
app.use(protect);

/* --- GLOBAL EJS LOCALS --- */
app.use((req, res, next) => {
  res.locals.isLoggedIn = !!req.user;
  res.locals.user = req.user || null;
  next();
});

/* ========== BASIC PAGES ========== */

app.get('/', (req, res) => res.redirect('/login'));

app.get('/login', (req, res) => {
  res.render('auth/login', {
    title: 'Login',
    error: req.query.error || '',
    message: req.query.registered ? 'Account created. Please log in.' : '',
  });
});

app.get('/register', (req, res) => {
  res.render('auth/register', { title: 'Register', error: '', formData: {} });
});

app.get('/logout', (req, res) => {
  res.clearCookie('authToken');
  res.redirect('/login');
});

/* ========== AUTH LOGIC ========== */

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.redirect('/login?error=Invalid+email+or+password');
    if (!user.isActive) return res.redirect('/login?error=Account+is+deactivated');

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.redirect('/login?error=Invalid+email+or+password');

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'devsecret',
      { expiresIn: '7d' }
    );
    res.cookie('authToken', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 });

    if (user.role === 'student') return res.redirect('/dashboard/student');
    if (user.role === 'driver') return res.redirect('/dashboard/driver');
    return res.redirect('/dashboard/admin');
  } catch (err) {
    console.error(err);
    res.redirect('/login?error=Something+went+wrong');
  }
});

app.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.render('auth/register', {
        title: 'Register', error: 'Email already registered.', formData: { fullName, email, role },
      });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ fullName, email: email.toLowerCase(), passwordHash, role: role || 'student' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' });
    res.cookie('authToken', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.render('auth/register-success', { title: 'Registration Complete', name: user.fullName, email: user.email, role: user.role });
  } catch (err) {
    console.error(err);
    res.render('auth/register', { title: 'Register', error: 'Something went wrong.', formData: req.body });
  }
});

/* ========== STUDENT DASHBOARD ========== */

app.get('/dashboard/student', async (req, res) => {
  if (!req.user) return res.redirect('/login');
  if (req.user.role !== 'student') return res.status(403).send('Access denied');

  try {
    // Rides available to browse
    const availableRides = await Ride.find({ availableSeats: { $gt: 0 } })
      .populate('driver', 'fullName')
      .sort({ departureTime: 1 })
      .limit(10);

    // Student's own requests
    const myRequests = await RideRequest.find({ student: req.user.id })
      .populate({ path: 'ride', populate: { path: 'driver', select: 'fullName' } })
      .sort({ createdAt: -1 });

    // Recent inbox messages
    const messages = await Message.find({
      $or: [{ sender: req.user.id }, { receiver: req.user.id }]
    }).populate('sender', 'fullName').populate('receiver', 'fullName')
      .sort({ createdAt: -1 }).limit(5);

    res.render('dashboard/student', {
      title: 'Student Dashboard',
      user: req.user,
      availableRides,
      myRequests,
      messages,
    });
  } catch (err) {
    console.error(err);
    res.render('dashboard/student', { title: 'Student Dashboard', user: req.user, availableRides: [], myRequests: [], messages: [] });
  }
});

/* ========== DRIVER DASHBOARD ========== */

app.get('/dashboard/driver', async (req, res) => {
  if (!req.user) return res.redirect('/login');
  if (req.user.role !== 'driver') return res.status(403).send('Access denied');

  try {
    const myRides = await Ride.find({ driver: req.user.id }).sort({ departureTime: -1 });

    const myRideIds = myRides.map(r => r._id);
    const requests = await RideRequest.find({ ride: { $in: myRideIds } })
      .populate('ride')
      .populate('student', 'fullName email')
      .sort({ createdAt: -1 });

    const messages = await Message.find({
      $or: [{ sender: req.user.id }, { receiver: req.user.id }]
    }).populate('sender', 'fullName').populate('receiver', 'fullName')
      .sort({ createdAt: -1 }).limit(5);

    res.render('dashboard/driver', {
      title: 'Driver Dashboard',
      user: req.user,
      myRides,
      requests,
      messages,
    });
  } catch (err) {
    console.error(err);
    res.render('dashboard/driver', { title: 'Driver Dashboard', user: req.user, myRides: [], requests: [], messages: [] });
  }
});

/* ========== RIDES/NEW (driver post ride form) ========== */

app.get('/rides/new', (req, res) => {
  if (!req.user) return res.redirect('/login');
  if (req.user.role !== 'driver') return res.status(403).send('Access denied');
  res.render('rides/new', { title: 'Post New Ride', user: req.user, error: '', success: '' });
});

app.post('/rides/new', async (req, res) => {
  if (!req.user) return res.redirect('/login');
  if (req.user.role !== 'driver') return res.status(403).send('Access denied');

  try {
    const { departureLocation, destination, departureDate, departureTime, availableSeats, vehicleInfo, notes } = req.body;

    if (!departureLocation || !destination || !departureDate || !departureTime) {
      return res.render('rides/new', { title: 'Post New Ride', user: req.user, error: 'All required fields must be filled.', success: '' });
    }

    const dt = new Date(`${departureDate}T${departureTime}`);
    if (isNaN(dt)) {
      return res.render('rides/new', { title: 'Post New Ride', user: req.user, error: 'Invalid date or time.', success: '' });
    }

    const { departureLat, departureLng, destinationLat, destinationLng } = req.body;
    await Ride.create({
      driver: req.user.id,
      departureLocation,
      destination,
      departureTime: dt,
      availableSeats: parseInt(availableSeats) || 1,
      vehicleInfo,
      notes,
      departureCoords: (departureLat && departureLng)
        ? { lat: parseFloat(departureLat), lng: parseFloat(departureLng) }
        : undefined,
      destinationCoords: (destinationLat && destinationLng)
        ? { lat: parseFloat(destinationLat), lng: parseFloat(destinationLng) }
        : undefined,
    });

    res.redirect('/dashboard/driver?success=Ride+posted+successfully');
  } catch (err) {
    console.error(err);
    res.render('rides/new', { title: 'Post New Ride', user: req.user, error: 'Failed to post ride.', success: '' });
  }
});

/* ========== ADMIN DASHBOARD ========== */

app.get('/dashboard/admin', async (req, res) => {
  if (!req.user) return res.redirect('/login');
  if (req.user.role !== 'admin') return res.status(403).send('Access denied');

  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
    const rides = await Ride.find().populate('driver', 'fullName').sort({ createdAt: -1 }).limit(10);
    const totalRides = await Ride.countDocuments();
    const totalUsers = await User.countDocuments();
    const activeDrivers = await User.countDocuments({ role: 'driver', isActive: true });

    res.render('dashboard/admin', {
      title: 'Admin Dashboard',
      user: req.user,
      users,
      rides,
      totalRides,
      totalUsers,
      activeDrivers,
      success: req.query.success || '',
    });
  } catch (err) {
    console.error(err);
    res.render('dashboard/admin', { title: 'Admin Dashboard', user: req.user, users: [], rides: [], totalRides: 0, totalUsers: 0, activeDrivers: 0, success: '' });
  }
});

// Admin: toggle user active/inactive
app.post('/admin/users/:id/toggle', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).send('Forbidden');
  if (req.user.id.toString() === req.params.id) return res.redirect('/dashboard/admin?success=Cannot+deactivate+yourself');
  try {
    const u = await User.findById(req.params.id);
    if (u) { u.isActive = !u.isActive; await u.save(); }
    res.redirect('/dashboard/admin?success=User+updated');
  } catch (err) {
    console.error(err);
    res.redirect('/dashboard/admin');
  }
});

// Admin: change user role
app.post('/admin/users/:id/role', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).send('Forbidden');
  try {
    const { role } = req.body;
    if (!['student', 'driver', 'admin'].includes(role)) return res.redirect('/dashboard/admin');
    await User.findByIdAndUpdate(req.params.id, { role });
    res.redirect('/dashboard/admin?success=Role+updated');
  } catch (err) {
    console.error(err);
    res.redirect('/dashboard/admin');
  }
});

// Admin: delete a ride
app.post('/admin/rides/:id/delete', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') return res.status(403).send('Forbidden');
  try {
    await Ride.findByIdAndDelete(req.params.id);
    res.redirect('/dashboard/admin?success=Ride+deleted');
  } catch (err) {
    console.error(err);
    res.redirect('/dashboard/admin');
  }
});

/* ========== STUDENT: Request a ride (form POST) ========== */

app.post('/rides/:rideId/request', async (req, res) => {
  if (!req.user) return res.redirect('/login');
  if (req.user.role !== 'student') return res.status(403).send('Only students can request rides');

  try {
    const rideId = req.params.rideId;
    const { message } = req.body;

    const ride = await Ride.findById(rideId);
    if (!ride) return res.redirect('/dashboard/student?error=Ride+not+found');

    const existing = await RideRequest.findOne({ ride: rideId, student: req.user.id });
    if (existing) return res.redirect('/dashboard/student?error=Already+requested+this+ride');

    if (ride.availableSeats <= 0) return res.redirect('/dashboard/student?error=No+seats+available');

    await RideRequest.create({ ride: rideId, student: req.user.id, message: message || '' });
    res.redirect('/dashboard/student?success=Request+sent');
  } catch (err) {
    console.error(err);
    res.redirect('/dashboard/student?error=Something+went+wrong');
  }
});

/* ========== DRIVER: Accept/Reject request (form POST) ========== */

app.post('/requests/:id/status', async (req, res) => {
  if (!req.user) return res.redirect('/login');

  try {
    const { status } = req.body;
    const rr = await RideRequest.findById(req.params.id).populate('ride');
    if (!rr) return res.redirect('/dashboard/driver?error=Request+not+found');

    if (rr.ride.driver.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).send('Forbidden');
    }

    if (status === 'Accepted' && rr.status !== 'Accepted') {
      // Atomic seat decrement
      const updated = await Ride.findOneAndUpdate(
        { _id: rr.ride._id, availableSeats: { $gt: 0 } },
        { $inc: { availableSeats: -1 } },
        { new: true }
      );
      if (!updated) return res.redirect('/dashboard/driver?error=No+seats+available');
    }

    if (status === 'Rejected' && rr.status === 'Accepted') {
      await Ride.findByIdAndUpdate(rr.ride._id, { $inc: { availableSeats: 1 } });
    }

    rr.status = status;
    await rr.save();
    res.redirect('/dashboard/driver?success=Request+updated');
  } catch (err) {
    console.error(err);
    res.redirect('/dashboard/driver?error=Something+went+wrong');
  }
});

/* ========== MESSAGING: Send message ========== */

app.post('/messages/send', async (req, res) => {
  if (!req.user) return res.redirect('/login');
  try {
    const { receiverId, rideId, content } = req.body;
    if (!receiverId || !content) return res.redirect('back');
    await Message.create({ sender: req.user.id, receiver: receiverId, ride: rideId || null, content });
    res.redirect('back');
  } catch (err) {
    console.error(err);
    res.redirect('back');
  }
});

/* ========== STUDENT: Cancel a request ========== */

app.post('/requests/:id/cancel', async (req, res) => {
  if (!req.user) return res.redirect('/login');
  try {
    const rr = await RideRequest.findById(req.params.id);
    if (!rr) return res.redirect('/dashboard/student?error=Request+not+found');
    if (rr.student.toString() !== req.user.id.toString()) return res.status(403).send('Forbidden');

    // Restore seat if it was already accepted
    if (rr.status === 'Accepted') {
      await Ride.findByIdAndUpdate(rr.ride, { $inc: { availableSeats: 1 } });
    }

    await RideRequest.findByIdAndDelete(req.params.id);
    res.redirect('/dashboard/student?success=Request+cancelled');
  } catch (err) {
    console.error(err);
    res.redirect('/dashboard/student?error=Something+went+wrong');
  }
});

/* ========== LIVE LOCATION SYSTEM ========== */

// In-memory location store: rideId -> { userId -> { lat, lng, role, name, updatedAt } }
const locationStore = new Map();
// SSE subscribers: rideId -> Set of res objects
const sseClients = new Map();

function broadcastLocation(rideId) {
  const clients = sseClients.get(rideId);
  if (!clients || clients.size === 0) return;
  const locations = Object.fromEntries(locationStore.get(rideId) || new Map());
  const data = `data: ${JSON.stringify(locations)}

`;
  clients.forEach(client => {
    try { client.write(data); } catch(e) {}
  });
}

// POST /api/location/:rideId  — user pushes their coordinates
app.post('/api/location/:rideId', async (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Not logged in' });
  const { lat, lng } = req.body;
  if (!lat || !lng) return res.status(400).json({ message: 'lat and lng required' });

  const rideId = req.params.rideId;
  if (!locationStore.has(rideId)) locationStore.set(rideId, new Map());
  locationStore.get(rideId).set(req.user.id.toString(), {
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    role: req.user.role,
    name: req.user.fullName || req.user.email,
    updatedAt: Date.now(),
  });

  broadcastLocation(rideId);
  res.json({ ok: true });
});

// GET /api/location/:rideId  — polling fallback; returns all current positions
app.get('/api/location/:rideId', (req, res) => {
  if (!req.user) return res.status(401).json({ message: 'Not logged in' });
  const store = locationStore.get(req.params.rideId);
  const locations = store ? Object.fromEntries(store) : {};
  res.json(locations);
});

// GET /api/location/:rideId/stream  — SSE real-time stream
app.get('/api/location/:rideId/stream', (req, res) => {
  if (!req.user) return res.status(401).send('Not logged in');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const rideId = req.params.rideId;
  if (!sseClients.has(rideId)) sseClients.set(rideId, new Set());
  sseClients.get(rideId).add(res);

  // Send current snapshot immediately
  const store = locationStore.get(rideId);
  if (store) {
    res.write(`data: ${JSON.stringify(Object.fromEntries(store))}

`);
  }

  req.on('close', () => {
    sseClients.get(rideId)?.delete(res);
  });
});

// GET /tracking/:rideId  — the live tracking page
app.get('/tracking/:rideId', async (req, res) => {
  if (!req.user) return res.redirect('/login');
  try {
    const ride = await Ride.findById(req.params.rideId).populate('driver', 'fullName email');
    if (!ride) return res.status(404).send('Ride not found');
    res.render('tracking/index', {
      title: 'Live Tracking',
      user: req.user,
      ride,
      rideId: req.params.rideId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading tracking page');
  }
});

/* ========== JSON API ROUTES ========== */

app.use('/api/rides', require('./routes/api.rides'));
app.use('/api/requests', require('./routes/api.requests'));
app.use('/api/messages', require('./routes/api.messages'));
app.use('/api/users', require('./routes/api.users'));

app.get('/api/health', (req, res) => res.json({ ok: true, name: 'Mustang RideShare API', version: '2.0.0' }));

/* --- ERROR HANDLER --- */
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Mustang RideShare running on http://localhost:${port}`));
