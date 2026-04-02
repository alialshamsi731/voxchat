const express = require('express');
const router = express.Router();
const { register, login, logout, me } = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');
const { authLimiter } = require('../middlewares/rateLimiter');

// Rate-limited auth endpoints
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.get('/me', authenticate, me);

module.exports = router;
