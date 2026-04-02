import { useState, useEffect, useCallback } from 'react'
import api from '../services/api.js'
import { useSocket } from '../context/SocketContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useVoice } from '../hooks/useVoice.js'
import Avatar from '../components/Avatar.jsx'
import MessageList from '../components/MessageList.jsx'
import MessageInput from '../components/MessageInput.jsx'
import VoiceRoom from '../components/VoiceRoom.jsx'
import { InviteCodeModal } from '../components/Modals.jsx'

/**
 * GroupView — shows a group's text channel or voice room
 *
 * Left panel of this component: channel sidebar (general text + voice room)
 * Main area: chat messages or voice UI
 */
const GroupView = ({ group, onStartDM, onMemberRemoved }) => {
  const { user } = useAuth()
  const { socket } = useSocket()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeChannel, setActiveChannel] = useState('general') // 'general' | 'voice'
  const [showInvite, setShowInvite] = useState(false)

  const { inVoice, participants, muted, voiceError, joinVoice, leaveVoice, toggleMute } = useVoice()

  // Load text messages when switching to general
  useEffect(() => {
    if (!group?.id) return
    setLoading(true)
    api.get(`/api/groups/${group.id}/messages`)
      .then(({ data }) => setMessages(data.messages || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [group.id])

  // Join the group socket room for real-time messages
  useEffect(() => {
    if (!socket || !group?.id) return
    socket.emit('group:join', { groupId: group.id })
  }, [socket, group.id])

  // Listen for incoming group messages
  useEffect(() => {
    if (!socket) return

    const handler = ({ message, groupId }) => {
      if (groupId !== group.id) return
      setMessages((prev) => {
        if (prev.find((m) => m.id === message.id)) return prev
        return [...prev, message]
      })
    }

    socket.on('group:newMessage', handler)
    return () => socket.off('group:newMessage', handler)
  }, [socket, group.id])

  const handleSendMessage = useCallback((content) => {
    if (!socket) return
    socket.emit('group:sendMessage', { groupId: group.id, content })
  }, [socket, group.id])

  const handleJoinVoice = () => {
    setActiveChannel('voice')
    joinVoice(group.id)
  }

  const handleLeaveVoice = () => {
    leaveVoice()
    setActiveChannel('general')
  }

  const handleRemoveMember = async (e, userId) => {
    e.stopPropagation()
    if (!window.confirm("Are you sure you want to remove this member?")) return
    try {
      setLoading(true)
      await api.delete(`/api/groups/${group.id}/members/${userId}`)
      onMemberRemoved?.(userId)
    } catch (err) {
      console.error('Failed to remove member:', err)
      alert(err.response?.data?.error || "Failed to remove member")
    } finally {
      setLoading(false)
    }
  }

  const isOwner = group.ownerId === user?.id

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      {/* ── Channel Sidebar ── */}
      <div className="w-48 bg-bg-800 border-r border-bg-500 flex flex-col shrink-0">
        {/* Group name header */}
        <div className="px-4 py-3 border-b border-bg-500">
          <h3 className="font-bold text-white text-sm truncate">{group.name}</h3>
          {isOwner && (
            <p className="text-xs text-gray-500 mt-0.5">You're the owner</p>
          )}
        </div>

        {/* Channels */}
        <div className="flex-1 px-2 py-3 space-y-0.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-2">
            Text Channels
          </p>
          <button
            id={`channel-general-${group.id}`}
            onClick={() => setActiveChannel('general')}
            className={`channel-item w-full text-left ${activeChannel === 'general' ? 'active' : ''}`}
          >
            <span className="text-gray-500 text-base">#</span>
            <span>general</span>
          </button>

          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mt-4 mb-2">
            Voice Channels
          </p>
          <button
            id={`channel-voice-${group.id}`}
            onClick={inVoice ? () => setActiveChannel('voice') : handleJoinVoice}
            className={`channel-item w-full text-left ${activeChannel === 'voice' ? 'active' : ''}`}
          >
            <svg className="w-4 h-4 text-gray-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
            </svg>
            <span>Voice Room</span>
            {inVoice && (
              <span className="ml-auto w-2 h-2 rounded-full bg-accent-green shrink-0" />
            )}
          </button>
        </div>

        {/* Invite button */}
        <div className="px-2 pb-3 border-t border-bg-500 pt-3">
          <button
            id={`invite-btn-${group.id}`}
            onClick={() => setShowInvite(true)}
            className="channel-item w-full text-left text-xs"
          >
            <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Invite People
          </button>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeChannel === 'general' && (
          <>
            {/* Header */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-bg-500 shrink-0">
              <span className="text-gray-400 font-bold text-lg">#</span>
              <span className="font-semibold text-white text-sm">general</span>
              <span className="text-gray-500 text-xs ml-2">· {group.name}</span>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <span className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <MessageList messages={messages} currentUserId={user?.id} />
            )}

            <MessageInput onSend={handleSendMessage} placeholder={`Message #general`} />
          </>
        )}

        {activeChannel === 'voice' && (
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-bg-500 shrink-0">
              <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
              </svg>
              <span className="font-semibold text-white text-sm">Voice Room</span>
              <span className="text-gray-500 text-xs ml-2">· {group.name}</span>
            </div>

            {/* Voice center area */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
              {!inVoice ? (
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-bg-700 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                    </svg>
                  </div>
                  <p className="text-white font-semibold mb-1">Voice Room</p>
                  <p className="text-gray-500 text-sm mb-5">No one is here yet. Join and invite friends!</p>
                  {voiceError && (
                    <p className="text-accent-red text-sm mb-4 bg-accent-red/10 rounded-lg px-4 py-2">{voiceError}</p>
                  )}
                  <button
                    id="join-voice-btn"
                    onClick={handleJoinVoice}
                    className="btn-primary px-8 py-3"
                  >
                    Join Voice Room
                  </button>
                </div>
              ) : (
                <div className="w-full max-w-xs">
                  {/* Participants grid */}
                  <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-3 text-center">
                    {participants.length + 1} in voice
                  </p>
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {/* Self */}
                    <div className="flex flex-col items-center gap-2">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-full bg-brand flex items-center justify-center text-white font-bold text-lg ring-2 ring-accent-green">
                          {user?.username?.[0]?.toUpperCase()}
                        </div>
                        {muted && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-accent-red flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
                            </svg>
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-300 text-center truncate w-16">{user?.username} (you)</span>
                    </div>

                    {/* Other participants */}
                    {participants.map((p) => (
                      <div key={p.socketId} className="flex flex-col items-center gap-2">
                        <div className="w-14 h-14 rounded-full bg-bg-600 flex items-center justify-center text-white font-bold text-lg ring-2 ring-accent-green">
                          {p.username?.[0]?.toUpperCase()}
                        </div>
                        <span className="text-xs text-gray-300 text-center truncate w-16">{p.username}</span>
                      </div>
                    ))}
                  </div>

                  <VoiceRoom
                    participants={participants}
                    muted={muted}
                    onToggleMute={toggleMute}
                    onLeave={handleLeaveVoice}
                    voiceError={voiceError}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Members sidebar */}
      <div className="w-44 bg-bg-800 border-l border-bg-500 px-3 py-4 hidden lg:flex flex-col gap-1 shrink-0">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
          Members — {group.members?.length || 0}
        </p>
        {group.members?.map((m) => {
          const isMe = m.userId === user?.id
          return (
            <div 
              key={m.id || m.userId} 
              onClick={() => !isMe && onStartDM?.(m.userId)}
              className={`flex items-center gap-2 px-1 py-1.5 rounded-lg group transition-colors ${!isMe ? 'hover:bg-bg-600 cursor-pointer' : ''}`}
              title={!isMe ? `Message ${m.user?.username}` : ''}
            >
              <div className="relative shrink-0">
                <Avatar username={m.user?.username} size="xs" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-accent-green border border-bg-800" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-300 truncate">{m.user?.username}</p>
                {m.role !== 'member' && (
                  <p className="text-[10px] text-brand capitalize leading-tight">{m.role}</p>
                )}
              </div>
              
              {/* Owner Remove Button */}
              {isOwner && !isMe && (
                <button
                  onClick={(e) => handleRemoveMember(e, m.userId)}
                  className="hidden group-hover:flex w-5 h-5 items-center justify-center rounded text-gray-500 hover:text-accent-red hover:bg-accent-red/10 shrink-0"
                  title="Remove Member"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )
        })}
      </div>

      {showInvite && <InviteCodeModal group={group} onClose={() => setShowInvite(false)} />}
    </div>
  )
}

export default GroupView
