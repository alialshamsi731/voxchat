import { useState } from 'react'
import api from '../services/api.js'

/**
 * Modal — Create Group
 */
export const CreateGroupModal = ({ onClose, onCreated }) => {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/api/groups/create', { name: name.trim() })
      onCreated(data.group)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create group')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-white mb-1">Create a Group</h2>
        <p className="text-sm text-gray-400 mb-5">Give your new community a name.</p>
        {error && <p className="text-accent-red text-sm mb-3">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Group Name
            </label>
            <input
              id="create-group-name"
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Gaming Squad"
              className="input-field"
              maxLength={64}
              required
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button id="create-group-submit" type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Creating…' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * Modal — Join Group via invite code
 */
export const JoinGroupModal = ({ onClose, onJoined }) => {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/api/groups/join', { inviteCode: code.trim() })
      onJoined(data.group)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join group')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-white mb-1">Join a Group</h2>
        <p className="text-sm text-gray-400 mb-5">Enter an invite code to join a community.</p>
        {error && <p className="text-accent-red text-sm mb-3">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Invite Code
            </label>
            <input
              id="join-group-code"
              autoFocus
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. AB12CD34"
              className="input-field font-mono tracking-widest"
              maxLength={16}
              required
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button id="join-group-submit" type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Joining…' : 'Join Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * Modal — Start DM by searching for a username
 */
export const StartDMModal = ({ onClose, onStarted }) => {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!search.trim()) return
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get(`/api/users/search?username=${encodeURIComponent(search.trim())}`)
      setResults(data.users || [])
      if (!data.users?.length) setError('No users found.')
    } catch {
      setError('Search failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleStartDM = async (userId) => {
    setStarting(true)
    try {
      const { data } = await api.post('/api/dm/start', { userId })
      onStarted(data.conversation)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Could not start DM')
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-white mb-1">New Direct Message</h2>
        <p className="text-sm text-gray-400 mb-5">Search for a user by username to start a DM.</p>
        {error && <p className="text-accent-red text-sm mb-3">{error}</p>}
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <input
            id="dm-search-input"
            autoFocus
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search username…"
            className="input-field flex-1"
          />
          <button id="dm-search-btn" type="submit" disabled={loading} className="btn-primary px-4 shrink-0">
            {loading ? '…' : 'Search'}
          </button>
        </form>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {results.map((u) => (
            <div key={u.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-bg-700 hover:bg-bg-600 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white text-xs font-semibold shrink-0">
                  {u.username[0].toUpperCase()}
                </div>
                <span className="text-sm text-gray-200">{u.username}</span>
              </div>
              <button
                onClick={() => handleStartDM(u.id)}
                disabled={starting}
                className="btn-primary text-xs px-3 py-1.5"
              >
                Message
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={onClose} className="btn-ghost w-full mt-4">Cancel</button>
      </div>
    </div>
  )
}

/**
 * Modal — Show group invite code
 */
export const InviteCodeModal = ({ group, onClose }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(group.inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-white mb-1">Invite People</h2>
        <p className="text-sm text-gray-400 mb-5">
          Share this code with friends to invite them to <strong className="text-white">{group.name}</strong>.
        </p>
        <div className="flex items-center gap-3 p-4 bg-bg-900 border border-bg-500 rounded-xl">
          <code className="flex-1 text-lg font-mono font-bold text-brand tracking-widest">{group.inviteCode}</code>
          <button
            id="copy-invite-btn"
            onClick={handleCopy}
            className={`btn-primary px-4 py-2 text-sm transition-all ${copied ? 'bg-accent-green' : ''}`}
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <button type="button" onClick={onClose} className="btn-ghost w-full mt-4">Close</button>
      </div>
    </div>
  )
}
