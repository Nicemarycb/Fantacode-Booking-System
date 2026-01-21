const express = require('express');
const router = express.Router();
const showsController = require('../controllers/showsController');

// Create a new show
router.post('/', showsController.createShow);

// Get all shows
router.get('/', showsController.getAllShows);

// Get seat availability for a show
router.get('/:showId/availability', showsController.getAvailability);

// Hold seats temporarily
router.post('/:showId/hold', showsController.holdSeats);

// Book seats (from holds)
router.post('/:showId/book', showsController.bookSeats);

// Get detailed statistics for a show
router.get('/:showId/stats', showsController.getStats);

// Database verification endpoint
router.get('/verify/database', showsController.verifyDatabase);

module.exports = router;
