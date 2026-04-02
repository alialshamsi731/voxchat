const prisma = require('../services/prisma');

/**
 * Group Socket Event Handlers
 *
 * Events handled:
 *   group:join        – join a group's socket room
 *   group:sendMessage – persist and broadcast group text message
 *
 * Events emitted:
 *   group:newMessage  – sent to all members in the group room
 */
const registerGroupHandlers = (io, socket) => {
  /**
   * Join a group's socket room after verifying membership.
   */
  socket.on('group:join', async ({ groupId }) => {
    try {
      const member = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId: socket.user.id } },
      });
      if (!member) return;

      socket.join(`group:${groupId}`);
    } catch (err) {
      console.error('group:join error:', err);
    }
  });

  /**
   * Persist a group message and broadcast to the group room.
   */
  socket.on('group:sendMessage', async ({ groupId, content }) => {
    try {
      if (!groupId || !content?.trim()) return;

      // Verify membership
      const member = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId: socket.user.id } },
      });
      if (!member) return;

      const message = await prisma.groupMessage.create({
        data: {
          groupId,
          senderId: socket.user.id,
          content: content.trim(),
        },
        include: {
          sender: { select: { id: true, username: true, avatarUrl: true } },
        },
      });

      io.to(`group:${groupId}`).emit('group:newMessage', { message, groupId });
    } catch (err) {
      console.error('group:sendMessage error:', err);
    }
  });
};

module.exports = registerGroupHandlers;
