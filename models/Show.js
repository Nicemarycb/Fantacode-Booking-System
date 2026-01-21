const mongoose = require('mongoose');

const heldSeatSchema = new mongoose.Schema({
  seatNumber: {
    type: Number,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } 
  }
}, { _id: false });

const showSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  totalSeats: {
    type: Number,
    required: true,
    min: 1
  },
  bookedSeats: {
    type: [Number],
    default: []
  },
  heldSeats: {
    type: [heldSeatSchema],
    default: []
  }
}, {
  timestamps: true
});


showSchema.index({ name: 1 });


showSchema.virtual('availableSeatsCount').get(function() {
  const heldSeatNumbers = this.heldSeats.map(h => h.seatNumber);
  const allOccupiedSeats = [...this.bookedSeats, ...heldSeatNumbers];
  return this.totalSeats - allOccupiedSeats.length;
});

// Virtual for held seats count
showSchema.virtual('heldSeatsCount').get(function() {
  return this.heldSeats.length;
});

// Virtual for booked seats count
showSchema.virtual('bookedSeatsCount').get(function() {
  return this.bookedSeats.length;
});

// Method to check if seats are available
showSchema.methods.areSeatsAvailable = function(seatNumbers) {
  const heldSeatNumbers = this.heldSeats.map(h => h.seatNumber);
  const allOccupiedSeats = [...this.bookedSeats, ...heldSeatNumbers];
  
  return seatNumbers.every(seat => 
    seat >= 1 && 
    seat <= this.totalSeats && 
    !allOccupiedSeats.includes(seat)
  );
};

// Method to hold seats
showSchema.methods.holdSeats = function(seatNumbers, holdDurationMinutes = 5) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + holdDurationMinutes * 60 * 1000);
  
  const newHolds = seatNumbers.map(seatNumber => ({
    seatNumber,
    expiresAt
  }));
  
  this.heldSeats.push(...newHolds);
  return this.save();
};

// Method to book seats (from holds)
showSchema.methods.bookSeats = function(seatNumbers) {
  // Remove from held seats
  this.heldSeats = this.heldSeats.filter(
    hold => !seatNumbers.includes(hold.seatNumber)
  );
  
  // Add to booked seats
  const newBookedSeats = seatNumbers.filter(
    seat => !this.bookedSeats.includes(seat)
  );
  this.bookedSeats.push(...newBookedSeats);
  
  return this.save();
};

module.exports = mongoose.model('Show', showSchema);
