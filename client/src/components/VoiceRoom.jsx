import Avatar from './Avatar.jsx'

/**
 * VoiceRoom — shows participants and mute/leave controls
 */
const VoiceRoom = ({ participants = [], muted, onToggleMute, onLeave, voiceError }) => {
  return (
    <div className="p-3 bg-bg-900/80 border-t border-bg-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
          <span className="text-xs font-semibold text-accent-green uppercase tracking-wider">Voice Connected</span>
        </div>
        <span className="text-xs text-gray-500">{participants.length} in room</span>
      </div>

      {voiceError && (
        <p className="text-xs text-accent-red mb-2 bg-accent-red/10 rounded px-2 py-1">{voiceError}</p>
      )}

      {/* Participants list */}
      <div className="space-y-1 mb-3 max-h-32 overflow-y-auto">
        {participants.map((p) => (
          <div key={p.socketId} className="flex items-center gap-2 px-1">
            <div className="relative">
              <Avatar username={p.username} size="xs" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-accent-green border border-bg-900" />
            </div>
            <span className="text-xs text-gray-300 truncate">{p.username}</span>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <button
          id="voice-mute-btn"
          onClick={onToggleMute}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            muted
              ? 'bg-accent-red/20 text-accent-red hover:bg-accent-red/30'
              : 'bg-bg-700 text-gray-300 hover:bg-bg-600'
          }`}
        >
          {muted ? (
            <>
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
              </svg>
              Unmute
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
              </svg>
              Mute
            </>
          )}
        </button>
        <button
          id="voice-leave-btn"
          onClick={onLeave}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-accent-red/10 text-accent-red hover:bg-accent-red hover:text-white transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
          </svg>
          Leave
        </button>
      </div>
    </div>
  )
}

export default VoiceRoom
