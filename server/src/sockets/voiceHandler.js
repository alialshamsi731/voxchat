/**
 * Voice Chat Socket Handler — WebRTC Signaling via Socket.io
 *
 * Architecture: P2P Mesh (max 6 users per room for stability)
 * The server acts ONLY as a signaling relay — no audio/video data flows through it.
 *
 * For >6 users, a future upgrade to mediasoup (SFU) is recommended.
 *
 * Signaling Flow:
 *   1. User A emits voice:joinRoom → server notifies existing members
 *   2. Each existing member creates an RTCPeerConnection and emits voice:offer to User A
 *   3. User A receives each offer, creates an answer, emits voice:answer back
 *   4. Both sides exchange ICE candidates via voice:iceCandidate
 *   5. On voice:leaveRoom, server notifies remaining members to clean up that peer
 */

const MAX_VOICE_ROOM_SIZE = 6;

// In-memory store: voiceRooms[groupId] = Set of socketIds
const voiceRooms = new Map();

const registerVoiceHandlers = (io, socket) => {
  /**
   * voice:joinRoom
   * User joins a voice room for a group.
   * Server sends back the list of existing participants, then tells
   * each existing participant that a new user has joined so they can
   * initiate an offer.
   */
  socket.on('voice:joinRoom', ({ groupId }) => {
    if (!groupId) return;

    const roomKey = `voice:${groupId}`;

    if (!voiceRooms.has(groupId)) {
      voiceRooms.set(groupId, new Map()); // Map<socketId, userInfo>
    }
    const room = voiceRooms.get(groupId);

    // Enforce max room size
    if (room.size >= MAX_VOICE_ROOM_SIZE) {
      socket.emit('voice:error', {
        message: `Voice room is full (max ${MAX_VOICE_ROOM_SIZE} participants).`,
      });
      return;
    }

    // Register this user in the room
    room.set(socket.id, {
      userId: socket.user.id,
      username: socket.user.username,
      socketId: socket.id,
    });

    socket.join(roomKey);

    // Send the joiner the list of existing participants so they know who to
    // expect offers FROM (existing members will initiate offers to the newcomer)
    const existingParticipants = Array.from(room.values()).filter(
      (p) => p.socketId !== socket.id
    );

    socket.emit('voice:roomUsers', { participants: existingParticipants });

    // Tell every other member a new user has joined; they should now create
    // an RTCPeerConnection and send an offer to the newcomer's socketId
    socket.to(roomKey).emit('voice:userJoined', {
      socketId: socket.id,
      userId: socket.user.id,
      username: socket.user.username,
    });

    console.log(`🎙️  ${socket.user.username} joined voice room for group ${groupId} (${room.size} total)`);
  });

  /**
   * voice:leaveRoom
   * Explicitly called when user clicks "Leave".
   */
  socket.on('voice:leaveRoom', ({ groupId }) => {
    handleVoiceLeave(io, socket, groupId);
  });

  /**
   * voice:offer
   * Relay an SDP offer from an existing member to the new joiner.
   * { targetSocketId, sdp }
   */
  socket.on('voice:offer', ({ targetSocketId, sdp }) => {
    io.to(targetSocketId).emit('voice:offer', {
      fromSocketId: socket.id,
      userId: socket.user.id,
      username: socket.user.username,
      sdp,
    });
  });

  /**
   * voice:answer
   * Relay an SDP answer from the new joiner back to the offer sender.
   * { targetSocketId, sdp }
   */
  socket.on('voice:answer', ({ targetSocketId, sdp }) => {
    io.to(targetSocketId).emit('voice:answer', {
      fromSocketId: socket.id,
      sdp,
    });
  });

  /**
   * voice:iceCandidate
   * Relay ICE candidates between peers.
   * { targetSocketId, candidate }
   */
  socket.on('voice:iceCandidate', ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit('voice:iceCandidate', {
      fromSocketId: socket.id,
      candidate,
    });
  });

  /**
   * Handle disconnect — auto-leave all voice rooms the user was in.
   */
  socket.on('disconnecting', () => {
    for (const [groupId, room] of voiceRooms.entries()) {
      if (room.has(socket.id)) {
        handleVoiceLeave(io, socket, groupId);
      }
    }
  });
};

/**
 * Shared leave logic — removes user from room, notifies peers.
 */
const handleVoiceLeave = (io, socket, groupId) => {
  const roomKey = `voice:${groupId}`;
  const room = voiceRooms.get(groupId);

  if (room) {
    room.delete(socket.id);
    if (room.size === 0) {
      voiceRooms.delete(groupId);
    }
  }

  socket.leave(roomKey);

  // Tell remaining participants to remove this peer's audio stream
  socket.to(roomKey).emit('voice:userLeft', {
    socketId: socket.id,
    userId: socket.user.id,
    username: socket.user.username,
  });

  console.log(`🔇 ${socket.user.username} left voice room for group ${groupId}`);
};

module.exports = registerVoiceHandlers;
