import { useEffect, useRef } from 'react'
import Avatar from './Avatar.jsx'

/**
 * MessageList — renders a scrollable list of chat messages
 * Automatically scrolls to the bottom when new messages arrive.
 */
const MessageList = ({ messages = [], currentUserId }) => {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-600 select-none">
        <svg className="w-10 h-10 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p className="text-sm">No messages yet. Say something!</p>
      </div>
    )
  }

  // Group consecutive messages from the same sender
  const grouped = messages.reduce((acc, msg) => {
    const last = acc[acc.length - 1]
    if (last && last[0].sender?.id === msg.sender?.id) {
      last.push(msg)
    } else {
      acc.push([msg])
    }
    return acc
  }, [])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
      {grouped.map((group, gi) => {
        const sender = group[0].sender
        const isOwn = sender?.id === currentUserId
        return (
          <div key={gi} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''} items-end mb-1`}>
            {/* Avatar only on first in group */}
            {!isOwn && (
              <div className="shrink-0 mb-0.5">
                <Avatar username={sender?.username} avatarUrl={sender?.avatarUrl} size="sm" />
              </div>
            )}
            <div className={`flex flex-col gap-0.5 max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
              {/* Username header only for first message in group */}
              {!isOwn && (
                <span className="text-xs text-gray-500 px-1 font-medium">{sender?.username}</span>
              )}
              {group.map((msg) => (
                <div
                  key={msg.id}
                  className={`px-3 py-2 rounded-xl text-sm leading-relaxed break-words ${
                    isOwn
                      ? 'bg-brand text-white rounded-br-sm'
                      : 'bg-bg-700 text-gray-100 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                  <span className={`text-xs ml-2 opacity-50 ${isOwn ? 'text-white' : 'text-gray-400'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}

export default MessageList
