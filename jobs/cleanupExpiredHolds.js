const Show = require('../models/Show');

let cleanupInterval = null;

const cleanupExpiredHolds = async () => {
  try {
    const shows = await Show.find({});
    const now = new Date();
    let cleanedCount = 0;
    
    for (const show of shows) {
      const initialHeldCount = show.heldSeats.length;
      show.heldSeats = show.heldSeats.filter(hold => hold.expiresAt > now);
      
      if (show.heldSeats.length !== initialHeldCount) {
        await show.save();
        cleanedCount += (initialHeldCount - show.heldSeats.length);
      }
    }
    
    // Cleaned expired holds silently
  } catch (error) {
    console.error('Error cleaning up expired holds:', error);
  }
};

const start = () => {
  // Run cleanup every minute
  cleanupInterval = setInterval(cleanupExpiredHolds, 60 * 1000);
  
  // Run immediately on start
  cleanupExpiredHolds();
};

const stop = () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
};

module.exports = {
  start,
  stop,
  cleanupExpiredHolds
};
