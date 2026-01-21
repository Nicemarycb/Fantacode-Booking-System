const mongoose = require('mongoose');
const Show = require('./models/Show');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://nicecb0307_db_user:BWWl9sT4TtgyaWcH@cluster0.x813hvj.mongodb.net/movie-booking?appName=Cluster0';

async function addMovie() {
  try {
    // Get movie name and seats from command line arguments
    const movieName = process.argv[2];
    const totalSeats = parseInt(process.argv[3]);

    if (!movieName || !totalSeats || totalSeats < 1) {
      console.log('Usage: node add-movie.js "Movie Name" <totalSeats>');
      console.log('Example: node add-movie.js "Avengers: Endgame" 100');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Create new show
    const show = new Show({
      name: movieName,
      totalSeats: totalSeats
    });

    await show.save();

    console.log('✅ Movie/Show added successfully!');
    console.log(`   Name: ${show.name}`);
    console.log(`   Total Seats: ${show.totalSeats}`);
    console.log(`   Show ID: ${show._id}`);
    console.log(`   Available Seats: ${show.totalSeats}`);

    await mongoose.connection.close();
    console.log('\nConnection closed');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

addMovie();
