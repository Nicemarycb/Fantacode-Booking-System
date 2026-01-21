# Movie Show Seat Booking System

A backend system for managing movie show seat bookings with support for concurrent bookings, seat holds, and automatic cleanup of expired reservations.

## Features

- **Seat Availability Management**: Track available, held, and booked seats for each show
- **Concurrent Booking Support**: Handle multiple simultaneous booking requests using MongoDB transactions
- **Temporary Seat Holds**: Reserve seats for a limited time (default 5 minutes) before booking
- **Automatic Cleanup**: MongoDB TTL index automatically removes expired holds
- **Atomic Operations**: Prevents double-booking using MongoDB transactions
- **System Resilience**: Handles system restarts, network failures, and incomplete bookings

## Technology Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database with Mongoose ODM
- **MongoDB Transactions** - For atomic operations

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd movie-seat-booking-system
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (optional):
Create a `.env` file in the root directory if you want to override defaults:
```
PORT=3000
MONGODB_URI=mongodb+srv://nicecb0307_db_user:BWWl9sT4TtgyaWcH@cluster0.x813hvj.mongodb.net/movie-booking?appName=Cluster0
```

Note: The system is configured to use MongoDB Atlas by default. No local MongoDB installation is required.

5. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### 1. Create a Show
**POST** `/api/shows`
```json
{
  "name": "Avengers: Endgame",
  "totalSeats": 100
}
```

### 2. Get Seat Availability
**GET** `/api/shows/:showId/availability`

Returns:
- Total seats
- Available seats count
- Held seats count
- Booked seats count
- Lists of booked and held seat numbers

### 3. Hold Seats Temporarily
**POST** `/api/shows/:showId/hold`
```json
{
  "seatNumbers": [1, 2, 3],
  "holdDurationMinutes": 5
}
```

Holds seats for a specified duration (default 5 minutes). Seats become available again if not booked within this time.

### 4. Book Seats
**POST** `/api/shows/:showId/book`
```json
{
  "seatNumbers": [1, 2, 3]
}
```

Books previously held seats. Seats must be held before booking.

### 5. Get Detailed Statistics
**GET** `/api/shows/:showId/stats`

Returns comprehensive information including:
- Available seat numbers
- Held seats with expiration times
- Booked seat numbers

### 6. Get All Shows
**GET** `/api/shows`

Returns a list of all shows.

## How the System Works

The system uses a simple two-step booking process:

1. **Hold Seats**: User selects seats → Seats are temporarily reserved (default 5 minutes)
2. **Book Seats**: User confirms → Held seats become permanently booked

**Key Components**:
- **MongoDB Transactions**: Ensure only one user can book a seat at a time
- **Automatic Expiration**: Held seats expire after timeout and become available again
- **Persistent Storage**: All data saved in MongoDB, survives system restarts

**Seat States**:
- **Available**: Seat is free and can be held
- **Held**: Seat is temporarily reserved (expires after timeout)
- **Booked**: Seat is permanently booked

## How the System Handles Challenges

### 1. Multiple Users Booking Simultaneously
- **Solution**: Uses MongoDB transactions with sessions to ensure atomic operations
- When multiple users try to book the same seat, only one transaction succeeds
- The other requests receive a 409 Conflict response

### 2. Users Selecting Seats But Not Completing Booking
- **Solution**: Two-step process (Hold → Book)
- Seats are first held temporarily (default 5 minutes)
- If not booked within the hold duration, they automatically become available
- MongoDB TTL index automatically removes expired holds

### 3. Seats Becoming Available Again After Timeout
- **Solution**: 
  - MongoDB TTL index on `expiresAt` field automatically removes expired holds
  - Availability checks clean expired holds before calculating availability

### 4. Users Refreshing Page or Retrying Requests
- **Solution**: Idempotent operations
- Holding the same seats again is safe (if still available)
- Booking already-booked seats returns an error (prevents double-booking)
- System state is always consistent

### 5. Booking Operations Completing But User Not Receiving Response
- **Solution**: 
  - Database operations are committed atomically
  - Even if the user doesn't receive the response, the booking is persisted
  - User can check availability to verify their booking status
  - System maintains consistency regardless of network issues

### 6. System Restarts During Bookings
- **Solution**:
  - All state is persisted in MongoDB
  - On restart, the system loads all shows and their current state
  - Expired holds are automatically cleaned by MongoDB TTL index
  - Availability checks clean expired holds on-demand
  - No data loss occurs

## System Design Decisions

### Database Schema
- **Shows Collection**: Stores show information with arrays for booked seats and held seats
- **Held Seats**: Include seat number and expiration timestamp
- **Indexes**: TTL index on `expiresAt` for automatic cleanup

### Concurrency Control
- **MongoDB Transactions**: All hold and book operations use transactions
- **Session-based Operations**: Ensures atomicity across multiple operations
- **Optimistic Locking**: MongoDB handles concurrent updates automatically

### Seat Hold Expiration
- **Default Duration**: 5 minutes (configurable per request)
- **Cleanup Mechanisms**:
  1. MongoDB TTL index (automatic)
  2. On-demand cleanup (during availability checks)

### Error Handling
- **409 Conflict**: When seats are not available or not held
- **404 Not Found**: When show doesn't exist
- **400 Bad Request**: When request data is invalid
- **500 Internal Server Error**: For unexpected errors

## Example Usage Flow

1. **Create a show**:
```bash
POST /api/shows
{
  "name": "The Matrix",
  "totalSeats": 50
}
```

2. **Check availability**:
```bash
GET /api/shows/{showId}/availability
```

3. **Hold seats**:
```bash
POST /api/shows/{showId}/hold
{
  "seatNumbers": [1, 2, 3],
  "holdDurationMinutes": 5
}
```

4. **Book seats** (within 5 minutes):
```bash
POST /api/shows/{showId}/book
{
  "seatNumbers": [1, 2, 3]
}
```

5. **Check stats**:
```bash
GET /api/shows/{showId}/stats
```

## Testing the System

You can test the system using tools like:
- **Postman**
- **curl**
- **Thunder Client** (VS Code extension)
- **HTTPie**

### Example curl commands:

```bash
# Create a show
curl -X POST http://localhost:3000/api/shows \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Movie","totalSeats":10}'

# Check availability
curl http://localhost:3000/api/shows/{showId}/availability

# Hold seats
curl -X POST http://localhost:3000/api/shows/{showId}/hold \
  -H "Content-Type: application/json" \
  -d '{"seatNumbers":[1,2,3]}'

# Book seats
curl -X POST http://localhost:3000/api/shows/{showId}/book \
  -H "Content-Type: application/json" \
  -d '{"seatNumbers":[1,2,3]}'
```

## Assumptions and Limitations

### Assumptions Made:
1. **Seat Numbering**: Seat numbers are sequential integers starting from 1 (e.g., 1, 2, 3...)
2. **Hold Duration**: Default hold time is 5 minutes, but can be customized per request
3. **Booking Process**: Users must hold seats before booking (two-step process)
4. **Scope**: System only handles seat management, not payment, authentication, or UI

### Limitations:
1. **No Authentication**: All API endpoints are public; anyone can create shows or book seats
2. **No Payment**: System doesn't process payments or verify payment before booking
3. **No UI**: Backend API only; requires API clients like Postman or curl to use
4. **No Notifications**: No email or SMS confirmations sent to users
5. **No History**: Only current booking state is tracked; no historical records
6. **No Hold Duration Limit**: Users can set hold duration to any value (no maximum enforced)
7. **No Cancellation**: Once booked, seats cannot be cancelled through the API

## Future Enhancements (Out of Scope)

- User authentication and authorization
- Payment processing integration
- Booking history and receipts
- Email/SMS notifications
- Seat selection UI
- Theatre and showtime management
- Analytics and reporting

## License

ISC
