const jwt = require('jsonwebtoken');
const registerDMHandlers = require('./dmHandler');
const registerGroupHandlers = require('./groupHandler');
const registerVoiceHandlers = require('./voiceHandler');
const registerCallHandlers = require('./callHandler');

/**
 * Main Socket.io setup.
 * Authenticates each connection via JWT, then registers event handlers.
 */
const registerSocketHandlers = (io) => {
  // ──────────────────────────────────────────────
  // Authentication middleware for Socket.io
  // ──────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication error: no token provided'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; // Attach user info to socket
      next();
    } catch (err) {
      return next(new Error('Authentication error: invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id} (user: ${socket.user.username})`);

    // Join a personal room using userId so we can target specific users
    socket.join(`user:${socket.user.id}`);

    // Register feature-specific handlers
    registerDMHandlers(io, socket);
    registerGroupHandlers(io, socket);
    registerVoiceHandlers(io, socket);
    registerCallHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      console.log(`❌ Socket disconnected: ${socket.id} (${reason})`);
    });
  });
};

module.exports = registerSocketHandlers;
