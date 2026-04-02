const prisma = require('../services/prisma');
const { nanoid } = require('nanoid');

/**
 * POST /api/groups/create
 */
const createGroup = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim().length < 1) {
      return res.status(400).json({ error: 'Group name is required' });
    }
    if (name.length > 64) {
      return res.status(400).json({ error: 'Group name must be 64 characters or less' });
    }

    const inviteCode = nanoid(8).toUpperCase();

    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        ownerId: req.user.id,
        inviteCode,
        members: {
          create: {
            userId: req.user.id,
            role: 'owner',
          },
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, username: true, avatarUrl: true } } },
        },
      },
    });

    return res.status(201).json({ group });
  } catch (err) {
    console.error('Create group error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/groups/join
 * Body: { inviteCode }
 */
const joinGroup = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) {
      return res.status(400).json({ error: 'inviteCode is required' });
    }

    const group = await prisma.group.findUnique({
      where: { inviteCode: inviteCode.trim().toUpperCase() },
    });
    if (!group) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    // Check if already a member
    const existing = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: req.user.id } },
    });
    if (existing) {
      return res.status(409).json({ error: 'You are already in this group' });
    }

    await prisma.groupMember.create({
      data: { groupId: group.id, userId: req.user.id, role: 'member' },
    });

    const updatedGroup = await prisma.group.findUnique({
      where: { id: group.id },
      include: {
        members: {
          include: { user: { select: { id: true, username: true, avatarUrl: true } } },
        },
      },
    });

    return res.json({ group: updatedGroup });
  } catch (err) {
    console.error('Join group error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/groups/my
 */
const getMyGroups = async (req, res) => {
  try {
    const memberships = await prisma.groupMember.findMany({
      where: { userId: req.user.id },
      include: {
        group: {
          include: {
            members: {
              include: { user: { select: { id: true, username: true, avatarUrl: true } } },
            },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    const groups = memberships.map((m) => m.group);
    return res.json({ groups });
  } catch (err) {
    console.error('Get my groups error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/groups/:groupId/messages
 */
const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { before, limit = 50 } = req.query;

    // Verify membership
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: req.user.id } },
    });
    if (!member) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    const messages = await prisma.groupMessage.findMany({
      where: {
        groupId,
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
    console.error('Get group messages error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * DELETE /api/groups/:groupId/members/:userId
 * Owner-only: remove a member from the group.
 */
const removeMember = async (req, res) => {
  try {
    const { groupId, userId } = req.params;

    // Only owner can remove
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (group.ownerId !== req.user.id) {
      return res.status(403).json({ error: 'Only the group owner can remove members' });
    }
    // Cannot remove yourself (owner)
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'You cannot remove yourself as owner' });
    }

    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) return res.status(404).json({ error: 'Member not found' });

    await prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId } },
    });

    // Notify the user they were kicked
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${userId}`).emit('group:kicked', { groupId });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Remove member error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { createGroup, joinGroup, getMyGroups, getGroupMessages, removeMember };
