const prisma = require('../services/prisma');

/**
 * POST /api/dm/start
 * Body: { userId } — start or retrieve a DM conversation with another user
 */
const startConversation = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot start a DM with yourself' });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, avatarUrl: true },
    });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Ensure consistent ordering so we never create duplicates
    const [user1Id, user2Id] = [req.user.id, userId].sort();

    let conversation = await prisma.dMConversation.findUnique({
      where: { user1Id_user2Id: { user1Id, user2Id } },
      include: {
        user1: { select: { id: true, username: true, avatarUrl: true } },
        user2: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    if (!conversation) {
      conversation = await prisma.dMConversation.create({
        data: { user1Id, user2Id },
        include: {
          user1: { select: { id: true, username: true, avatarUrl: true } },
          user2: { select: { id: true, username: true, avatarUrl: true } },
        },
      });
    }

    return res.json({ conversation });
  } catch (err) {
    console.error('Start conversation error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/dm/my
 */
const getMyConversations = async (req, res) => {
  try {
    const conversations = await prisma.dMConversation.findMany({
      where: {
        OR: [{ user1Id: req.user.id }, { user2Id: req.user.id }],
      },
      include: {
        user1: { select: { id: true, username: true, avatarUrl: true } },
        user2: { select: { id: true, username: true, avatarUrl: true } },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    return res.json({ conversations });
  } catch (err) {
    console.error('Get my conversations error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/dm/:conversationId/messages
 */
const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { before, limit = 50 } = req.query;

    // Verify the user is a participant
    const conversation = await prisma.dMConversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    if (conversation.user1Id !== req.user.id && conversation.user2Id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const messages = await prisma.dMMessage.findMany({
      where: {
        conversationId,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      include: {
        sender: { select: { id: true, username: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
    });

    return res.json({ messages: messages.reverse() });
  } catch (err) {
    console.error('Get DM messages error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { startConversation, getMyConversations, getMessages };
