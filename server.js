const express = require('express');
const mongoose = require('mongoose');
const showRoutes = require('./routes/shows');
const cleanupJob = require('./jobs/cleanupExpiredHolds');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.use('/api/shows', showRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Movie Seat Booking System is running' });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://nicecb0307_db_user:BWWl9sT4TtgyaWcH@cluster0.x813hvj.mongodb.net/movie-booking?appName=Cluster0')
.then(() => {
  console.log('Connected to MongoDB');
  
  // Start cleanup job
  cleanupJob.start();
  
  // Start server
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  cleanupJob.stop();
  mongoose.connection.close(() => {
    process.exit(0);
  });
});
