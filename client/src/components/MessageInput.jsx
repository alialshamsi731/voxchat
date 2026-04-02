import { useState, useRef, useEffect } from 'react'

/**
 * MessageInput — text input bar with send button
 * Supports Enter to send, Shift+Enter for newline.
 */
const MessageInput = ({ onSend, placeholder = 'Message…', disabled = false }) => {
  const [value, setValue] = useState('')
  const textareaRef = useRef(null)

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
    }
  }, [value])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  return (
    <div className="px-4 py-3 border-t border-bg-500">
      <div className="flex items-end gap-2 bg-bg-700 rounded-xl border border-bg-500 px-3 py-2 focus-within:border-brand transition-colors">
        <textarea
          ref={textareaRef}
          id="message-input"
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-transparent text-gray-100 placeholder-gray-500 text-sm resize-none outline-none leading-relaxed max-h-28 disabled:opacity-40"
        />
        <button
          id="message-send-btn"
          onClick={handleSend}
          disabled={!value.trim() || disabled}
          className="shrink-0 mb-0.5 w-8 h-8 rounded-lg bg-brand hover:bg-brand-dark text-white flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
      <p className="text-xs text-gray-600 mt-1 pl-1">Enter to send · Shift+Enter for newline</p>
    </div>
  )
}

export default MessageInput
