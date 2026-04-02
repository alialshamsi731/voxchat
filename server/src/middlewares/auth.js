const jwt = require('jsonwebtoken');

/**
 * Middleware to verify JWT token from Authorization header or cookie.
 * Attaches decoded user to req.user on success.
 */
const authenticate = (req, res, next) => {
  try {
    // Try Bearer token first, then cookie
    let token = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, username, email, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { authenticate };
