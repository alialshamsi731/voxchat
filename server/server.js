require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// Routes
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const groupRoutes = require('./src/routes/groups');
const dmRoutes = require('./src/routes/dm');

// Socket handlers
const registerSocketHandlers = require('./src/sockets');

const app = express();
const httpServer = http.createServer(app);

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// ──────────────────────────────────────────────
// Middleware
// ──────────────────────────────────────────────
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// ──────────────────────────────────────────────
// REST API Routes
// ──────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/dm', dmRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ──────────────────────────────────────────────
// Socket.io Setup
// ──────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Attach io to app so routes can access it if needed
app.set('io', io);

// Register all socket event handlers
registerSocketHandlers(io);

// ──────────────────────────────────────────────
// Production Frontend Serving
// ──────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  // Serve static files from the React frontend app
  app.use(express.static(path.join(__dirname, '../client/dist')));

  // For any distinct route not handled by API, send back the React index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
  });
}

// ──────────────────────────────────────────────
// Start Server
// ──────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`✅ VoxLink server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.io ready`);
});
