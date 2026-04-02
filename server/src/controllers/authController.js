const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../services/prisma');

const SALT_ROUNDS = 12;
const JWT_EXPIRES_IN = '7d';

/**
 * Generate a signed JWT for the user
 */
const signToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Basic validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email, and password are required' });
    }
    if (username.length < 2 || username.length > 32) {
      return res.status(400).json({ error: 'Username must be 2–32 characters' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Check for existing user
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) {
      return res.status(409).json({ error: 'Username or email already in use' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
      data: { username, email, passwordHash },
      select: { id: true, username: true, email: true, createdAt: true },
    });

    const token = signToken(user);

    // Set httpOnly cookie + return token in body (supports both approaches)
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(201).json({ user, token });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken(user);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const { passwordHash, ...safeUser } = user;
    return res.json({ user: safeUser, token });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/auth/logout
 */
const logout = (req, res) => {
  res.clearCookie('token');
  return res.json({ message: 'Logged out successfully' });
};

/**
 * GET /api/auth/me
 */
const me = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, email: true, avatarUrl: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user });
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { register, login, logout, me };
