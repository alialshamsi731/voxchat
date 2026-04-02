import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useSocket } from '../context/SocketContext.jsx'
import api from '../services/api.js'
import Avatar from '../components/Avatar.jsx'
import DMView from '../components/DMView.jsx'
import GroupView from '../components/GroupView.jsx'
import {
  CreateGroupModal,
  JoinGroupModal,
  StartDMModal,
} from '../components/Modals.jsx'

/**
 * AppPage — Main authenticated layout.
 *
 * Layout:
 *  [Group/DM rail 64px] | [Channel list 200px] | [Main content] | [Members 176px]
 *
 * On mobile: responsive stacked layout (rail only).
 */
const AppPage = () => {
  const { user, logout } = useAuth()
  const { socket, connected } = useSocket()

  // Data
  const [groups, setGroups] = useState([])
  const [conversations, setConversations] = useState([])

  // Selection state
  const [view, setView] = useState('dm') // 'dm' | 'group'
  const [activeGroup, setActiveGroup] = useState(null)
  const [activeConversation, setActiveConversation] = useState(null)

  // Modal state
  const [modal, setModal] = useState(null) // 'createGroup' | 'joinGroup' | 'startDM'

  // Load initial data
  useEffect(() => {
    api.get('/api/groups/my').then(({ data }) => {
      setGroups(data.groups || [])
    }).catch(console.error)

    api.get('/api/dm/my').then(({ data }) => {
      setConversations(data.conversations || [])
    }).catch(console.error)
  }, [])

  // Listen for kicks
  useEffect(() => {
    if (!socket) return

    const handleKicked = ({ groupId }) => {
      setGroups((prev) => prev.filter((g) => g.id !== groupId))
      setActiveGroup((current) => {
        if (current?.id === groupId) {
          setView('dm')
          return null
        }
        return current
      })
    }

    socket.on('group:kicked', handleKicked)
    return () => socket.off('group:kicked', handleKicked)
  }, [socket])

  const handleGroupCreated = (group) => {
    setGroups((prev) => [...prev, group])
    setActiveGroup(group)
    setView('group')
  }

  const handleGroupJoined = (group) => {
    setGroups((prev) => {
      if (prev.find((g) => g.id === group.id)) return prev
      return [...prev, group]
    })
    setActiveGroup(group)
    setView('group')
  }

  const handleDMStarted = (conv) => {
    setConversations((prev) => {
      if (prev.find((c) => c.id === conv.id)) return prev
      return [conv, ...prev]
    })
    setActiveConversation(conv)
    setView('dm')
  }

  const selectGroup = (group) => {
    setActiveGroup(group)
    setView('group')
    setActiveConversation(null)
  }

  const selectConversation = (conv) => {
    setActiveConversation(conv)
    setView('dm')
    setActiveGroup(null)
  }

  const otherUser = (conv) => {
    return conv.user1?.id === user?.id ? conv.user2 : conv.user1
  }

  const startDMWithUser = async (userId) => {
    try {
      if (userId === user?.id) return
      const { data } = await api.post('/api/dm/start', { userId })
      handleDMStarted(data.conversation)
    } catch (err) {
      console.error('Failed to start DM:', err)
    }
  }

  return (
    <div className="h-screen flex overflow-hidden bg-bg-900 font-sans select-none">
      {/* ──────────────── Left Rail ──────────────── */}
      <aside className="w-16 bg-bg-900 border-r border-bg-500 flex flex-col items-center py-3 gap-2 shrink-0 z-10">
        {/* Logo */}
        <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center mb-2 shadow-lg shadow-brand/30 shrink-0">
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
          </svg>
        </div>

        {/* Divider */}
        <div className="w-8 h-px bg-bg-500 my-1 shrink-0" />

        {/* DM button */}
        <button
          id="nav-dm"
          title="Direct Messages"
          onClick={() => { setView('dm'); setActiveGroup(null) }}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all group relative ${
            view === 'dm' && !activeGroup
              ? 'bg-brand rounded-2xl shadow-lg shadow-brand/30'
              : 'bg-bg-700 hover:bg-brand hover:rounded-2xl'
          }`}
        >
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
          </svg>
        </button>

        {/* Divider */}
        <div className="w-8 h-px bg-bg-500 my-1 shrink-0" />

        {/* Group icons */}
        <div className="flex flex-col items-center gap-2 flex-1 overflow-y-auto w-full px-2 no-scrollbar">
          {groups.map((g) => (
            <button
              key={g.id}
              id={`nav-group-${g.id}`}
              title={g.name}
              onClick={() => selectGroup(g)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white transition-all relative shrink-0 ${
                activeGroup?.id === g.id
                  ? 'bg-brand rounded-2xl shadow-lg shadow-brand/30'
                  : 'bg-bg-600 hover:bg-brand hover:rounded-2xl'
              }`}
            >
              {g.name?.[0]?.toUpperCase()}
              {/* Active indicator bar */}
              {activeGroup?.id === g.id && (
                <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-7 bg-white rounded-r-full" />
              )}
            </button>
          ))}
        </div>

        {/* Add group buttons */}
        <div className="flex flex-col gap-2 items-center mt-auto">
          <button
            id="btn-create-group"
            title="Create Group"
            onClick={() => setModal('createGroup')}
            className="w-10 h-10 rounded-xl bg-bg-700 hover:bg-accent-green hover:rounded-2xl flex items-center justify-center text-accent-green hover:text-white transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            id="btn-join-group"
            title="Join Group"
            onClick={() => setModal('joinGroup')}
            className="w-10 h-10 rounded-xl bg-bg-700 hover:bg-brand-light hover:rounded-2xl flex items-center justify-center text-gray-400 hover:text-white transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 015.656 0l4 4a4 4 0 01-5.656 5.656l-1.102-1.101" />
            </svg>
          </button>
        </div>
      </aside>

      {/* ──────────────── Secondary Sidebar ──────────────── */}
      <aside className="w-56 bg-bg-800 border-r border-bg-500 flex flex-col shrink-0">
        {view === 'dm' || activeGroup === null ? (
          /* DM List */
          <>
            <div className="px-4 py-3 border-b border-bg-500">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Direct Messages</h2>
            </div>
            {/* New DM button */}
            <button
              id="btn-new-dm"
              onClick={() => setModal('startDM')}
              className="mx-3 my-2 flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:bg-bg-600 hover:text-white transition-all text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Message
            </button>

            <div className="flex-1 overflow-y-auto px-2 space-y-0.5 pb-2">
              {conversations.length === 0 && (
                <p className="text-xs text-gray-600 px-3 py-4 text-center">
                  No messages yet.<br />Start a DM above!
                </p>
              )}
              {conversations.map((conv) => {
                const other = otherUser(conv)
                return (
                  <button
                    key={conv.id}
                    id={`dm-${conv.id}`}
                    onClick={() => selectConversation(conv)}
                    className={`sidebar-item w-full ${activeConversation?.id === conv.id ? 'active' : ''}`}
                  >
                    <Avatar username={other?.username} size="sm" className="shrink-0" />
                    <span className="truncate text-sm">{other?.username}</span>
                  </button>
                )
              })}
            </div>
          </>
        ) : null}

        {/* User Footer */}
        <div className="border-t border-bg-500 px-3 py-3 flex items-center gap-2">
          <Avatar username={user?.username} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.username}</p>
            <div className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-accent-green' : 'bg-gray-600'}`} />
              <span className="text-[10px] text-gray-500">{connected ? 'Online' : 'Reconnecting…'}</span>
            </div>
          </div>
          <button
            id="btn-logout"
            onClick={logout}
            title="Log out"
            className="w-7 h-7 rounded-lg text-gray-500 hover:text-accent-red hover:bg-accent-red/10 flex items-center justify-center transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </aside>

      {/* ──────────────── Main Content ──────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {!activeGroup && !activeConversation && (
          /* Welcome / Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 rounded-3xl bg-brand/20 flex items-center justify-center mb-5">
              <svg className="w-10 h-10 text-brand" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Welcome to VoxLink, {user?.username}!</h2>
            <p className="text-gray-500 text-sm max-w-sm mb-6">
              Select a group or DM from the sidebar, or get started below.
            </p>
            <div className="flex gap-3">
              <button id="home-create-group" onClick={() => setModal('createGroup')} className="btn-primary">
                Create a Group
              </button>
              <button id="home-join-group" onClick={() => setModal('joinGroup')} className="btn-ghost border border-bg-500">
                Join with Code
              </button>
              <button id="home-new-dm" onClick={() => setModal('startDM')} className="btn-ghost border border-bg-500">
                New DM
              </button>
            </div>
          </div>
        )}

        {activeConversation && !activeGroup && (
          <DMView conversation={activeConversation} />
        )}

        {activeGroup && (
          <GroupView
            key={activeGroup.id}
            group={activeGroup}
            onStartDM={startDMWithUser}
            onMemberRemoved={(userId) => {
              // Update local state without full reload
              setGroups(prev => prev.map(g => {
                if (g.id !== activeGroup.id) return g
                return { ...g, members: g.members.filter(m => m.userId !== userId) }
              }))
              setActiveGroup(prev => ({
                ...prev,
                members: prev.members.filter(m => m.userId !== userId)
              }))
            }}
          />
        )}
      </main>

      {/* ──────────────── Modals ──────────────── */}
      {modal === 'createGroup' && (
        <CreateGroupModal onClose={() => setModal(null)} onCreated={handleGroupCreated} />
      )}
      {modal === 'joinGroup' && (
        <JoinGroupModal onClose={() => setModal(null)} onJoined={handleGroupJoined} />
      )}
      {modal === 'startDM' && (
        <StartDMModal onClose={() => setModal(null)} onStarted={handleDMStarted} />
      )}
    </div>
  )
}

export default AppPage
