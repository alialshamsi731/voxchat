const prisma = require('../services/prisma');

/**
 * GET /api/users/search?username=
 */
const searchUsers = async (req, res) => {
  try {
    const { username } = req.query;
    if (!username || username.trim().length < 1) {
      return res.status(400).json({ error: 'username query param is required' });
    }

    const users = await prisma.user.findMany({
      where: {
        username: {
          contains: username.trim(),
          mode: 'insensitive',
        },
        NOT: { id: req.user.id }, // exclude self
      },
      select: { id: true, username: true, avatarUrl: true },
      take: 10,
    });

    return res.json({ users });
  } catch (err) {
    console.error('Search users error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { searchUsers };
