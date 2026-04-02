/**
 * 1-on-1 Call Socket Handler — WebRTC Signaling
 *
 * Events handled:
 *   call:request   - caller rings callee
 *   call:accept    - callee accepts call
 *   call:decline   - callee declines call
 *   call:end       - either side ends call
 *   call:offer     - WebRTC SDP offer
 *   call:answer    - WebRTC SDP answer
 *   call:ice       - ICE candidates
 */

// Keep track of active calls: conversationId -> { user1, user2 }
const activeCalls = new Map();

const registerCallHandlers = (io, socket) => {
  /**
   * Caller initiates a call
   */
  socket.on('call:request', ({ conversationId, targetUserId }) => {
    if (!conversationId || !targetUserId) return;

    // Send ringing event to target user
    io.to(`user:${targetUserId}`).emit('call:incoming', {
      conversationId,
      callerId: socket.user.id,
      callerUsername: socket.user.username,
      callerSocketId: socket.id,
    });
  });

  /**
   * Callee accepts the call
   */
  socket.on('call:accept', ({ conversationId, callerSocketId }) => {
    // Notify caller that call was accepted so they can send the SDP offer
    io.to(callerSocketId).emit('call:accepted', {
      conversationId,
      accepterSocketId: socket.id,
      accepterId: socket.user.id,
    });
  });

  /**
   * Callee declines the call
   */
  socket.on('call:decline', ({ callerSocketId }) => {
    io.to(callerSocketId).emit('call:declined');
  });

  /**
   * End call
   */
  socket.on('call:end', ({ targetSocketId }) => {
    if (targetSocketId) {
      io.to(targetSocketId).emit('call:ended');
    }
  });

  /**
   * WebRTC Signaling
   */
  socket.on('call:offer', ({ targetSocketId, sdp }) => {
    io.to(targetSocketId).emit('call:offer', {
      fromSocketId: socket.id,
      sdp,
    });
  });

  socket.on('call:answer', ({ targetSocketId, sdp }) => {
    io.to(targetSocketId).emit('call:answer', {
      fromSocketId: socket.id,
      sdp,
    });
  });

  socket.on('call:ice', ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit('call:ice', {
      fromSocketId: socket.id,
      candidate,
    });
  });
};

module.exports = registerCallHandlers;
