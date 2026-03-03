const mongoose = require('mongoose');

const coordSchema = new mongoose.Schema({
  lat: { type: Number },
  lng: { type: Number },
}, { _id: false });

const rideSchema = new mongoose.Schema(
  {
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    destination: { type: String, required: true },
    departureLocation: { type: String, required: true },
    departureTime: { type: Date, required: true },
    availableSeats: { type: Number, default: 1, min: 0 },
    vehicleInfo: String,
    isOffer: { type: Boolean, default: true },
    notes: String,
    // Optional map coordinates
    departureCoords: coordSchema,
    destinationCoords: coordSchema,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ride', rideSchema);
