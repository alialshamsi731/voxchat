/**
 * useVoice — WebRTC Voice Chat Hook
 *
 * Architecture: P2P Full Mesh via WebRTC
 * Signaling: Socket.io (offer/answer/ICE relay through server)
 *
 * Flow:
 *  JOIN: user emits voice:joinRoom → server sends back existing participants
 *        → server tells existing members this user joined
 *        → existing members create RTCPeerConnection + send offer to new user
 *        → new user answers each offer
 *        → ICE candidates are exchanged bilaterally
 *
 *  LEAVE: user emits voice:leaveRoom → server notifies peers to close connection
 */

import { useRef, useState, useCallback } from 'react'
import { useSocket } from '../context/SocketContext.jsx'

// ICE servers: using public Google STUN servers
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

export const useVoice = () => {
  const { socket } = useSocket()
  const [inVoice, setInVoice] = useState(false)
  const [participants, setParticipants] = useState([]) // [{ socketId, userId, username }]
  const [muted, setMuted] = useState(false)
  const [voiceError, setVoiceError] = useState(null)

  // Refs — not state, to avoid re-render on every update
  const localStreamRef = useRef(null)
  const peersRef = useRef({}) // peersRef.current[socketId] = RTCPeerConnection
  const currentGroupIdRef = useRef(null)

  // ─────────────────────────────────────────────────
  // Create a new RTCPeerConnection for a remote peer
  // ─────────────────────────────────────────────────
  const createPeer = useCallback((remoteSocketId) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    // Add local audio tracks to the connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current)
      })
    }

    // When we get a remote audio track, play it immediately
    pc.ontrack = (event) => {
      const audio = new Audio()
      audio.srcObject = event.streams[0]
      audio.autoplay = true
      // Store reference on the pc so we can clean it up later
      pc._audioEl = audio
    }

    // Relay ICE candidates through the signaling server
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('voice:iceCandidate', {
          targetSocketId: remoteSocketId,
          candidate: event.candidate,
        })
      }
    }

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Peer ${remoteSocketId} state: ${pc.connectionState}`)
    }

    return pc
  }, [socket])

  // ─────────────────────────────────────────────────
  // Remove a peer cleanly
  // ─────────────────────────────────────────────────
  const removePeer = useCallback((socketId) => {
    const pc = peersRef.current[socketId]
    if (pc) {
      if (pc._audioEl) {
        pc._audioEl.pause()
        pc._audioEl.srcObject = null
      }
      pc.close()
      delete peersRef.current[socketId]
    }
    setParticipants((prev) => prev.filter((p) => p.socketId !== socketId))
  }, [])

  // ─────────────────────────────────────────────────
  // Register socket event listeners for signaling
  // ─────────────────────────────────────────────────
  const registerVoiceEvents = useCallback(() => {
    if (!socket) return

    // Server sends us the current room occupants
    socket.on('voice:roomUsers', async ({ participants: existingPeers }) => {
      setParticipants(existingPeers)
      // We are the newcomer; wait for offers from existing peers
    })

    // An existing member tells us a new user just joined — we initiate the offer
    socket.on('voice:userJoined', async ({ socketId, userId, username }) => {
      setParticipants((prev) => {
        if (prev.find((p) => p.socketId === socketId)) return prev
        return [...prev, { socketId, userId, username }]
      })

      // Create a connection and make an offer to the new user
      const pc = createPeer(socketId)
      peersRef.current[socketId] = pc

      try {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        socket.emit('voice:offer', { targetSocketId: socketId, sdp: offer })
      } catch (err) {
        console.error('[WebRTC] Offer error:', err)
      }
    })

    // We receive an offer from an existing member (we are the newcomer)
    socket.on('voice:offer', async ({ fromSocketId, userId, username, sdp }) => {
      setParticipants((prev) => {
        if (prev.find((p) => p.socketId === fromSocketId)) return prev
        return [...prev, { socketId: fromSocketId, userId, username }]
      })

      const pc = createPeer(fromSocketId)
      peersRef.current[fromSocketId] = pc

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        socket.emit('voice:answer', { targetSocketId: fromSocketId, sdp: answer })
      } catch (err) {
        console.error('[WebRTC] Answer error:', err)
      }
    })

    // We receive an answer to our offer
    socket.on('voice:answer', async ({ fromSocketId, sdp }) => {
      const pc = peersRef.current[fromSocketId]
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp))
        } catch (err) {
          console.error('[WebRTC] Set remote description error:', err)
        }
      }
    })

    // ICE candidate relay
    socket.on('voice:iceCandidate', async ({ fromSocketId, candidate }) => {
      const pc = peersRef.current[fromSocketId]
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (err) {
          console.error('[WebRTC] Add ICE candidate error:', err)
        }
      }
    })

    // A peer left the voice room
    socket.on('voice:userLeft', ({ socketId }) => {
      removePeer(socketId)
    })

    // Handle errors from server
    socket.on('voice:error', ({ message }) => {
      setVoiceError(message)
    })
  }, [socket, createPeer, removePeer])

  // ─────────────────────────────────────────────────
  // Join voice room
  // ─────────────────────────────────────────────────
  const joinVoice = useCallback(async (groupId) => {
    if (!socket || inVoice) return
    setVoiceError(null)

    try {
      // Request microphone with echo/noise cancellation
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      })
      localStreamRef.current = stream
      currentGroupIdRef.current = groupId

      registerVoiceEvents()
      socket.emit('voice:joinRoom', { groupId })
      setInVoice(true)
    } catch (err) {
      console.error('[Voice] Could not get microphone:', err)
      setVoiceError('Microphone access denied. Please allow microphone in your browser.')
    }
  }, [socket, inVoice, registerVoiceEvents])

  // ─────────────────────────────────────────────────
  // Leave voice room
  // ─────────────────────────────────────────────────
  const leaveVoice = useCallback(() => {
    if (!socket || !inVoice) return

    const groupId = currentGroupIdRef.current
    socket.emit('voice:leaveRoom', { groupId })

    // Stop all local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
    }

    // Close all peer connections
    Object.keys(peersRef.current).forEach(removePeer)
    peersRef.current = {}

    // Remove voice event listeners to avoid duplicates on rejoin
    socket.off('voice:roomUsers')
    socket.off('voice:userJoined')
    socket.off('voice:offer')
    socket.off('voice:answer')
    socket.off('voice:iceCandidate')
    socket.off('voice:userLeft')
    socket.off('voice:error')

    currentGroupIdRef.current = null
    setInVoice(false)
    setParticipants([])
    setMuted(false)
  }, [socket, inVoice, removePeer])

  // ─────────────────────────────────────────────────
  // Toggle mute
  // ─────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return
    const audioTrack = localStreamRef.current.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      setMuted(!audioTrack.enabled)
    }
  }, [])

  return { inVoice, participants, muted, voiceError, joinVoice, leaveVoice, toggleMute }
}
