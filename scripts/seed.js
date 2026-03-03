// scripts/seed.js — Mustang RideShare Demo Data Seeder
// Run with: node scripts/seed.js

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// Load models
const User = require(path.join(__dirname, '../models/User'));
const Ride = require(path.join(__dirname, '../models/Ride'));
const RideRequest = require(path.join(__dirname, '../models/RideRequest'));
const Message = require(path.join(__dirname, '../models/Message'));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mustang-rideshare';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB:', MONGODB_URI);

  // Clear existing data
  await User.deleteMany({});
  await Ride.deleteMany({});
  await RideRequest.deleteMany({});
  await Message.deleteMany({});
  console.log('🗑️  Cleared existing data');

  // ---- USERS ----
  const hash = async (pw) => bcrypt.hash(pw, 10);

  const [admin, driver1, driver2, student1, student2, student3] = await User.insertMany([
    { fullName: 'Admin User',       email: 'admin@smsu.edu',    passwordHash: await hash('admin123'),   role: 'admin',   isActive: true },
    { fullName: 'Alex Kowalski',    email: 'alex@smsu.edu',     passwordHash: await hash('password1'),  role: 'driver',  isActive: true },
    { fullName: 'Sara Bentley',     email: 'sara@smsu.edu',     passwordHash: await hash('password2'),  role: 'driver',  isActive: true },
    { fullName: 'Dani Mamo',        email: 'dani@smsu.edu',     passwordHash: await hash('password3'),  role: 'student', isActive: true },
    { fullName: 'Amanuel Tesfaye',  email: 'amanuel@smsu.edu',  passwordHash: await hash('password4'),  role: 'student', isActive: true },
    { fullName: 'Priya Nair',       email: 'priya@smsu.edu',    passwordHash: await hash('password5'),  role: 'student', isActive: true },
  ]);
  console.log('👥 Created 6 users (1 admin, 2 drivers, 3 students)');

  // ---- RIDES ----
  const now = new Date();
  const future = (days, hour) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(hour, 0, 0, 0);
    return d;
  };

  const [ride1, ride2, ride3, ride4, ride5] = await Ride.insertMany([
    {
      driver: driver1._id,
      departureLocation: 'SMSU Campus',
      destination: 'Sioux Falls, SD',
      departureTime: future(1, 17),
      availableSeats: 3,
      vehicleInfo: 'Blue Honda Civic — MN ABC-123',
      notes: 'Leaving from Central Field parking lot. Please be there 10 min early.',
    },
    {
      driver: driver1._id,
      departureLocation: 'SMSU Campus',
      destination: 'Walmart Marshall',
      departureTime: future(2, 19),
      availableSeats: 4,
      vehicleInfo: 'Silver Toyota Camry',
      notes: 'Quick grocery run, back in ~1 hour.',
    },
    {
      driver: driver2._id,
      departureLocation: 'SMSU Campus',
      destination: 'Minneapolis, MN',
      departureTime: future(3, 14),
      availableSeats: 2,
      vehicleInfo: 'Red Ford Focus — MN XYZ-789',
      notes: 'Dropping off near Mall of America.',
    },
    {
      driver: driver2._id,
      departureLocation: 'Marshall, MN',
      destination: 'Mankato, MN',
      departureTime: future(4, 9),
      availableSeats: 3,
      vehicleInfo: 'White Chevy Malibu',
      notes: null,
    },
    {
      driver: driver1._id,
      departureLocation: 'SMSU Campus',
      destination: 'Sioux Falls, SD',
      departureTime: future(7, 16),
      availableSeats: 4,
      vehicleInfo: 'Blue Honda Civic — MN ABC-123',
      notes: 'Weekend trip. Cost-share appreciated.',
    },
  ]);
  console.log('🚗 Created 5 rides');

  // ---- RIDE REQUESTS ----
  await RideRequest.insertMany([
    {
      ride: ride1._id,
      student: student1._id,
      message: 'I need to catch a 7 PM flight, can I join?',
      status: 'Pending',
    },
    {
      ride: ride2._id,
      student: student1._id,
      message: 'Can we stop by CVS on the way back?',
      status: 'Accepted',
    },
    {
      ride: ride3._id,
      student: student2._id,
      message: '',
      status: 'Accepted',
    },
    {
      ride: ride1._id,
      student: student2._id,
      message: 'Heading to a family event, would really appreciate it!',
      status: 'Pending',
    },
    {
      ride: ride3._id,
      student: student3._id,
      message: 'I can help with gas money.',
      status: 'Rejected',
    },
  ]);
  console.log('📋 Created 5 ride requests');

  // ---- MESSAGES ----
  await Message.insertMany([
    {
      sender: driver1._id,
      receiver: student1._id,
      ride: ride1._id,
      content: "I'll pick you up in front of Central Field at 5:20 PM.",
    },
    {
      sender: driver2._id,
      receiver: student1._id,
      ride: ride2._id,
      content: 'Can you confirm if you still need the Walmart ride?',
    },
    {
      sender: student1._id,
      receiver: driver1._id,
      ride: ride1._id,
      content: "I'll be at the Student Center entrance at 5:20.",
    },
    {
      sender: student2._id,
      receiver: driver2._id,
      ride: ride3._id,
      content: 'Thanks again for the ride! Really helped me out.',
    },
  ]);
  console.log('💬 Created 4 messages');

  console.log('\n🎉 Seed complete! Demo accounts:');
  console.log('   Admin:   admin@smsu.edu    / admin123');
  console.log('   Driver:  alex@smsu.edu     / password1');
  console.log('   Driver:  sara@smsu.edu     / password2');
  console.log('   Student: dani@smsu.edu     / password3');
  console.log('   Student: amanuel@smsu.edu  / password4');
  console.log('   Student: priya@smsu.edu    / password5');

  await mongoose.disconnect();
  console.log('\n✅ Done.');
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
