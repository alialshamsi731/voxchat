const prisma = require('../services/prisma');

/**
 * DM Socket Event Handlers
 *
 * Events handled:
 *   dm:joinConversation  – join a socket room for a DM conversation
 *   dm:sendMessage       – persist and broadcast a new DM message
 *
 * Events emitted:
 *   dm:newMessage        – sent to both participants in the conversation
 */
const registerDMHandlers = (io, socket) => {
  /**
   * Join a specific DM conversation room so both users receive new messages.
   * Validates that the user is a participant before joining.
   */
  socket.on('dm:joinConversation', async ({ conversationId }) => {
    try {
      const conversation = await prisma.dMConversation.findUnique({
        where: { id: conversationId },
      });
      if (!conversation) return;

      const isParticipant =
        conversation.user1Id === socket.user.id ||
        conversation.user2Id === socket.user.id;

      if (!isParticipant) return;

      socket.join(`dm:${conversationId}`);
    } catch (err) {
      console.error('dm:joinConversation error:', err);
    }
  });

  /**
   * Send a DM message — persists to DB, broadcasts to conversation room.
   */
  socket.on('dm:sendMessage', async ({ conversationId, content }) => {
    try {
      if (!conversationId || !content?.trim()) return;

      // Validate participation
      const conversation = await prisma.dMConversation.findUnique({
        where: { id: conversationId },
      });
      if (!conversation) return;

      const isParticipant =
        conversation.user1Id === socket.user.id ||
        conversation.user2Id === socket.user.id;
      if (!isParticipant) return;

      // Persist message
      const message = await prisma.dMMessage.create({
        data: {
          conversationId,
          senderId: socket.user.id,
          content: content.trim(),
        },
        include: {
          sender: { select: { id: true, username: true, avatarUrl: true } },
        },
      });

      // Update lastMessageAt on conversation
      await prisma.dMConversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      });

      // Broadcast to the conversation room (both participants if they joined)
      io.to(`dm:${conversationId}`).emit('dm:newMessage', { message });

      // Also push to personal rooms so offline recipients get it when they rejoin
      const otherId =
        conversation.user1Id === socket.user.id
          ? conversation.user2Id
          : conversation.user1Id;
      io.to(`user:${otherId}`).emit('dm:newMessage', { message, conversationId });
    } catch (err) {
      console.error('dm:sendMessage error:', err);
    }
  });
};

module.exports = registerDMHandlers;
