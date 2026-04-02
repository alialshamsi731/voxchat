import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { useSocket } from './SocketContext.jsx'
import { useAuth } from './AuthContext.jsx'

const CallContext = createContext(null)

export const useCall = () => useContext(CallContext)

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

export const CallProvider = ({ children }) => {
  const { user } = useAuth()
  const { socket } = useSocket()
  
  // Call states: idle, ringing, calling, connected
  const [callState, setCallState] = useState('idle')
  const [incomingCall, setIncomingCall] = useState(null)
  const [activeCall, setActiveCall] = useState(null)
  
  // WebRTC state
  const [muted, setMuted] = useState(false)
  const [voiceError, setVoiceError] = useState(null)

  const localStreamRef = useRef(null)
  const peerRef = useRef(null)
  const remoteAudioRef = useRef(null)

  // ─────────────────────────────────────────────────
  // Setup / Teardown Peer
  // ─────────────────────────────────────────────────
  const createPeer = useCallback((targetSocketId) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current)
      })
    }

    pc.ontrack = (event) => {
      if (!remoteAudioRef.current) {
        remoteAudioRef.current = new Audio()
        remoteAudioRef.current.autoplay = true
      }
      remoteAudioRef.current.srcObject = event.streams[0]
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('call:ice', {
          targetSocketId,
          candidate: event.candidate,
        })
      }
    }

    return pc
  }, [socket])

  const cleanupCall = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
    }
    if (peerRef.current) {
      peerRef.current.close()
      peerRef.current = null
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause()
      remoteAudioRef.current.srcObject = null
      remoteAudioRef.current = null
    }
    setCallState('idle')
    setIncomingCall(null)
    setActiveCall(null)
    setMuted(false)
  }, [])

  // ─────────────────────────────────────────────────
  // Socket Events
  // ─────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !user) return

    // Received incoming call request
    socket.on('call:incoming', (data) => {
      if (callState !== 'idle') {
        // Busy - politely decline
        socket.emit('call:decline', { callerSocketId: data.callerSocketId })
        return
      }
      setIncomingCall(data)
      setCallState('ringing')
    })

    // Caller: Callee accepted
    socket.on('call:accepted', async ({ conversationId, accepterSocketId, accepterId }) => {
      setCallState('connected')
      setActiveCall({ conversationId, peerSocketId: accepterSocketId, peerId: accepterId })
      
      const pc = createPeer(accepterSocketId)
      peerRef.current = pc

      try {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        socket.emit('call:offer', { targetSocketId: accepterSocketId, sdp: offer })
      } catch (err) {
        console.error('[WebRTC Call] Offer error:', err)
      }
    })

    // Caller: Callee declined
    socket.on('call:declined', () => {
      alert("Call declined.")
      cleanupCall()
    })

    // Call ended by peer
    socket.on('call:ended', () => {
      cleanupCall()
    })

    // Callee receives offer
    socket.on('call:offer', async ({ fromSocketId, sdp }) => {
      const pc = createPeer(fromSocketId)
      peerRef.current = pc

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        socket.emit('call:answer', { targetSocketId: fromSocketId, sdp: answer })
      } catch (err) {
        console.error('[WebRTC Call] Answer error:', err)
      }
    })

    // Caller receives answer
    socket.on('call:answer', async ({ sdp }) => {
      if (peerRef.current) {
        try {
          await peerRef.current.setRemoteDescription(new RTCSessionDescription(sdp))
        } catch (err) {
          console.error('[WebRTC Call] Set answer error:', err)
        }
      }
    })

    // ICE candidates
    socket.on('call:ice', async ({ candidate }) => {
      if (peerRef.current && candidate) {
        try {
          await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (err) {
          console.error('[WebRTC Call] ICE error:', err)
        }
      }
    })

    return () => {
      socket.off('call:incoming')
      socket.off('call:accepted')
      socket.off('call:declined')
      socket.off('call:ended')
      socket.off('call:offer')
      socket.off('call:answer')
      socket.off('call:ice')
    }
  }, [socket, user, callState, createPeer, cleanupCall])

  // ─────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────
  const startCall = async (conversationId, targetUserId) => {
    if (callState !== 'idle') return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      localStreamRef.current = stream
      setCallState('calling')
      setActiveCall({ conversationId, targetUserId })
      socket.emit('call:request', { conversationId, targetUserId })
    } catch (err) {
      setVoiceError("Microphone access denied.")
      console.error(err)
    }
  }

  const acceptCall = async () => {
    if (!incomingCall) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      localStreamRef.current = stream
      setCallState('connected')
      setActiveCall({ 
        conversationId: incomingCall.conversationId, 
        peerSocketId: incomingCall.callerSocketId,
        peerId: incomingCall.callerId,
        peerUsername: incomingCall.callerUsername
      })
      
      socket.emit('call:accept', { 
        conversationId: incomingCall.conversationId,
        callerSocketId: incomingCall.callerSocketId
      })
      setIncomingCall(null)
    } catch (err) {
      setVoiceError("Microphone access denied.")
      declineCall()
    }
  }

  const declineCall = () => {
    if (incomingCall) {
      socket.emit('call:decline', { callerSocketId: incomingCall.callerSocketId })
    }
    cleanupCall()
  }

  const endCall = () => {
    if (activeCall?.peerSocketId) {
      socket.emit('call:end', { targetSocketId: activeCall.peerSocketId })
    } else if (callState === 'calling' && activeCall?.targetUserId) {
       // Ideally we'd map targetUserId to socketId, but we can emit a broadcast or personal event if needed.
       // For simplicity, ending while ringing will just clean up local. The callee won't get a strict "cancel".
       // In a full app, we'd emit a 'call:cancelled' to the user room.
       socket.emit('call:end', { targetSocketId: null /* add mapping if needed */ })
    }
    cleanupCall()
  }

  const toggleMute = () => {
    if (!localStreamRef.current) return
    const audioTrack = localStreamRef.current.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      setMuted(!audioTrack.enabled)
    }
  }

  const value = {
    callState,
    incomingCall,
    activeCall,
    muted,
    voiceError,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute
  }

  return (
    <CallContext.Provider value={value}>
      {children}
    </CallContext.Provider>
  )
}
