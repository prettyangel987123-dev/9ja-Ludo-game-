const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const gameManager = require('./src/managers/gameManager');
const socketManager = require('./src/managers/socketManager');
const roomManager = require('./src/managers/roomManager');
const playerManager = require('./src/managers/playerManager');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5000',
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP'
});
app.use(limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Get public rooms
app.get('/api/rooms', (req, res) => {
  try {
    const rooms = roomManager.getPublicRooms();
    res.json({
      success: true,
      data: rooms
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create room via REST
app.post('/api/rooms', (req, res) => {
  try {
    const { playerName, isPrivate, difficulty } = req.body;
    const room = roomManager.createRoom(playerName, isPrivate, difficulty);
    res.json({
      success: true,
      data: room
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get room details
app.get('/api/rooms/:roomId', (req, res) => {
  try {
    const { roomId } = req.params;
    const room = roomManager.getRoom(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }
    res.json({
      success: true,
      data: room
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get player profile
app.get('/api/profile/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const profile = playerManager.getProfile(userId);
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Player not found'
      });
    }
    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get leaderboard
app.get('/api/leaderboard', (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const leaderboard = playerManager.getLeaderboard(parseInt(limit), parseInt(page));
    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  socketManager.handleConnection(socket, io);

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    socketManager.handleDisconnect(socket, io);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log('9ja Ludo Game Server');
  console.log(`${'='.repeat(50)}`);
  console.log(`Server running on: http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Turn Timer: ${process.env.TURN_TIMER}s`);
  console.log(`Match Timer: ${process.env.MATCH_TIMER}s`);
  console.log(`${'='.repeat(50)}\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = { app, server, io };
