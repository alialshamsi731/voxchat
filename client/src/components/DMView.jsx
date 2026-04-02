import { useState, useEffect, useCallback } from 'react'
import api from '../services/api.js'
import { useSocket } from '../context/SocketContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import MessageList from '../components/MessageList.jsx'
import MessageInput from '../components/MessageInput.jsx'
import Avatar from '../components/Avatar.jsx'
import { useCall } from '../context/CallContext.jsx'

/**
 * DMView — shows messages for a single DM conversation
 * and handles real-time updates via Socket.io
 */
const DMView = ({ conversation }) => {
  const { user } = useAuth()
  const { socket } = useSocket()
  const { callState, activeCall, startCall, endCall, toggleMute, muted } = useCall()
  
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)

  // Determine the other participant for display
  const otherUser = conversation.user1?.id === user?.id ? conversation.user2 : conversation.user1

  const isCallActiveInThisDM = activeCall?.conversationId === conversation.id
  const isCallingTarget = callState === 'calling' && activeCall?.targetUserId === otherUser?.id

  // Load historical messages
  useEffect(() => {
    if (!conversation?.id) return
    setLoading(true)
    api.get(`/api/dm/${conversation.id}/messages`)
      .then(({ data }) => setMessages(data.messages || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [conversation.id])

  // Join the socket room for this conversation
  useEffect(() => {
    if (!socket || !conversation?.id) return
    socket.emit('dm:joinConversation', { conversationId: conversation.id })
  }, [socket, conversation.id])

  // Listen for new messages
  useEffect(() => {
    if (!socket) return

    const handler = ({ message, conversationId }) => {
      // Only react if this message belongs to the current conversation
      const msgConvId = conversationId || message.conversationId
      if (msgConvId && msgConvId !== conversation.id) return
      setMessages((prev) => {
        // Deduplicate
        if (prev.find((m) => m.id === message.id)) return prev
        return [...prev, message]
      })
    }

    socket.on('dm:newMessage', handler)
    return () => socket.off('dm:newMessage', handler)
  }, [socket, conversation.id])

  const handleSend = useCallback((content) => {
    if (!socket) return
    socket.emit('dm:sendMessage', { conversationId: conversation.id, content })
  }, [socket, conversation.id])

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-bg-500 shrink-0">
        <div className="flex items-center gap-3">
          <Avatar username={otherUser?.username} avatarUrl={otherUser?.avatarUrl} size="md" />
          <div>
            <p className="font-semibold text-white text-sm">{otherUser?.username}</p>
            <p className="text-xs text-gray-500">Direct Message</p>
          </div>
        </div>

        {/* Call Controls in Header */}
        <div className="flex items-center gap-3">
          {callState === 'idle' && (
            <button
              onClick={() => startCall(conversation.id, otherUser.id)}
              className="w-10 h-10 rounded-xl bg-bg-700 hover:bg-brand-light hover:rounded-2xl flex items-center justify-center text-gray-400 hover:text-white transition-all"
              title="Start Voice Call"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Active Call Banner */}
      {(isCallActiveInThisDM || isCallingTarget) && (
        <div className={`px-5 py-3 flex items-center justify-between shrink-0 transition-colors ${
          callState === 'connected' ? 'bg-brand/10 border-b border-brand/20' : 'bg-bg-800 border-b border-bg-500'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full animate-pulse ${callState === 'connected' ? 'bg-accent-green' : 'bg-brand'}`} />
            <div>
              <p className="text-sm font-semibold text-white">
                {callState === 'calling' ? `Calling ${otherUser.username}...` : `Call in progress`}
              </p>
              <p className="text-xs text-brand">
                {callState === 'connected' ? 'Connected via WebRTC' : 'Waiting for answer...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {callState === 'connected' && (
              <button
                onClick={toggleMute}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition-all ${
                  muted ? 'bg-accent-red hover:bg-red-600' : 'bg-bg-600 hover:bg-bg-500'
                }`}
                title={muted ? "Unmute" : "Mute"}
              >
                {muted ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                  </svg>
                )}
              </button>
            )}
            <button
              onClick={endCall}
              className="w-9 h-9 rounded-full bg-accent-red hover:bg-red-600 flex items-center justify-center text-white transition-all shadow-lg"
              title="End Call"
            >
               <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <MessageList messages={messages} currentUserId={user?.id} />
      )}

      <MessageInput
        onSend={handleSend}
        placeholder={`Message @${otherUser?.username}`}
      />
    </div>
  )
}

export default DMView
