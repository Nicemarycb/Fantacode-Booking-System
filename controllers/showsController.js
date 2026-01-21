const Show = require('../models/Show');
const mongoose = require('mongoose');

// Create a new show
const createShow = async (req, res) => {
  try {
    const { name, totalSeats } = req.body;
    
    if (!name || !totalSeats || totalSeats < 1) {
      return res.status(400).json({ 
        error: 'Name and totalSeats (>= 1) are required' 
      });
    }
    
    const show = new Show({ name, totalSeats });
    await show.save();
    
    res.status(201).json(show);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get seat availability for a show
const getAvailability = async (req, res) => {
  try {
    const show = await Show.findById(req.params.showId);
    
    if (!show) {
      return res.status(404).json({ error: 'Show not found' });
    }
    
   
    const now = new Date();
    show.heldSeats = show.heldSeats.filter(hold => hold.expiresAt > now);
    await show.save();
    
    res.json({
      showId: show._id,
      showName: show.name,
      totalSeats: show.totalSeats,
      availableSeats: show.availableSeatsCount,
      heldSeats: show.heldSeatsCount,
      bookedSeats: show.bookedSeatsCount,
      bookedSeatNumbers: show.bookedSeats,
      heldSeatNumbers: show.heldSeats.map(h => h.seatNumber)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Hold seats temporarily
const holdSeats = async (req, res) => {
  const session = await Show.startSession();
  session.startTransaction();
  
  try {
    const { seatNumbers, holdDurationMinutes } = req.body;
    const holdDuration = holdDurationMinutes || 5; 
    
    if (!seatNumbers || !Array.isArray(seatNumbers) || seatNumbers.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ 
        error: 'seatNumbers array is required' 
      });
    }
    
    
    const show = await Show.findById(req.params.showId).session(session);
    
    if (!show) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Show not found' });
    }
    
    
    const now = new Date();
    show.heldSeats = show.heldSeats.filter(hold => hold.expiresAt > now);
    
    // Check if seats are available
    if (!show.areSeatsAvailable(seatNumbers)) {
      await session.abortTransaction();
      return res.status(409).json({ 
        error: 'One or more seats are not available',
        requestedSeats: seatNumbers
      });
    }
    
    // Hold the seats
    await show.holdSeats(seatNumbers, holdDuration);
    await session.commitTransaction();
    
    res.json({
      success: true,
      message: 'Seats held successfully',
      showId: show._id,
      heldSeats: seatNumbers,
      expiresAt: new Date(now.getTime() + holdDuration * 60 * 1000)
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
};

// Book seats (from holds)
const bookSeats = async (req, res) => {
  const session = await Show.startSession();
  session.startTransaction();
  
  try {
    const { seatNumbers } = req.body;
    
    if (!seatNumbers || !Array.isArray(seatNumbers) || seatNumbers.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ 
        error: 'seatNumbers array is required' 
      });
    }
    
    
    const show = await Show.findById(req.params.showId).session(session);
    
    if (!show) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Show not found' });
    }
    
    
    const now = new Date();
    show.heldSeats = show.heldSeats.filter(hold => hold.expiresAt > now);
    
    
    const heldSeatNumbers = show.heldSeats.map(h => h.seatNumber);
    const allRequestedSeatsHeld = seatNumbers.every(seat => heldSeatNumbers.includes(seat));
    
    if (!allRequestedSeatsHeld) {
      await session.abortTransaction();
      return res.status(409).json({ 
        error: 'One or more seats are not held or have expired',
        requestedSeats: seatNumbers,
        heldSeats: heldSeatNumbers
      });
    }
    
    // Book the seats
    await show.bookSeats(seatNumbers);
    await session.commitTransaction();
    
    res.json({
      success: true,
      message: 'Seats booked successfully',
      showId: show._id,
      bookedSeats: seatNumbers,
      bookingId: `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
};

// Get detailed statistics for a show
const getStats = async (req, res) => {
  try {
    const show = await Show.findById(req.params.showId);
    
    if (!show) {
      return res.status(404).json({ error: 'Show not found' });
    }
    
    // Clean expired holds
    const now = new Date();
    show.heldSeats = show.heldSeats.filter(hold => hold.expiresAt > now);
    await show.save();
    
    const heldSeatNumbers = show.heldSeats.map(h => h.seatNumber);
    const availableSeatNumbers = [];
    
    for (let i = 1; i <= show.totalSeats; i++) {
      if (!show.bookedSeats.includes(i) && !heldSeatNumbers.includes(i)) {
        availableSeatNumbers.push(i);
      }
    }
    
    res.json({
      showId: show._id,
      showName: show.name,
      totalSeats: show.totalSeats,
      availableSeats: {
        count: show.availableSeatsCount,
        seatNumbers: availableSeatNumbers
      },
      heldSeats: {
        count: show.heldSeatsCount,
        details: show.heldSeats.map(h => ({
          seatNumber: h.seatNumber,
          expiresAt: h.expiresAt,
          expiresInSeconds: Math.max(0, Math.floor((h.expiresAt - now) / 1000))
        }))
      },
      bookedSeats: {
        count: show.bookedSeatsCount,
        seatNumbers: show.bookedSeats
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all shows
const getAllShows = async (req, res) => {
  try {
    const shows = await Show.find({});
    res.json(shows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Database verification endpoint - shows all data in database
const verifyDatabase = async (req, res) => {
  try {
    const db = mongoose.connection;
    
    // Check database connection
    const connectionStatus = db.readyState === 1 ? 'Connected' : 'Disconnected';
    const dbName = db.name;
    
    // Get all shows with full details
    const shows = await Show.find({});
    
    // Count total documents
    const totalShows = await Show.countDocuments({});
    
    // Get database stats
    const dbStats = {
      connectionStatus,
      databaseName: dbName,
      totalShows,
      shows: shows.map(show => ({
        _id: show._id,
        name: show.name,
        totalSeats: show.totalSeats,
        bookedSeats: show.bookedSeats,
        bookedSeatsCount: show.bookedSeats.length,
        heldSeats: show.heldSeats,
        heldSeatsCount: show.heldSeats.length,
        availableSeats: show.availableSeatsCount,
        createdAt: show.createdAt,
        updatedAt: show.updatedAt
      }))
    };
    
    res.json({
      success: true,
      message: 'Database verification successful',
      data: dbStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message,
      message: 'Database verification failed'
    });
  }
};

module.exports = {
  createShow,
  getAvailability,
  holdSeats,
  bookSeats,
  getStats,
  getAllShows,
  verifyDatabase
};
