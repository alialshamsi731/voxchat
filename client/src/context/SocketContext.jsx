import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext.jsx'

const SocketContext = createContext(null)

const SOCKET_URL = import.meta.env.PROD ? undefined : 'http://localhost:3001'

export const SocketProvider = ({ children }) => {
  const { user, getToken } = useAuth()
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const socketRef = useRef(null)

  useEffect(() => {
    if (!user) {
      // If user logs out, disconnect socket
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
        setSocket(null)
        setConnected(false)
      }
      return
    }

    const token = getToken()
    if (!token) return

    const s = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    s.on('connect', () => {
      console.log('✅ Socket connected:', s.id)
      setConnected(true)
    })

    s.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason)
      setConnected(false)
    })

    s.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message)
    })

    socketRef.current = s
    setSocket(s)

    return () => {
      s.disconnect()
      socketRef.current = null
      setSocket(null)
      setConnected(false)
    }
  }, [user]) // Re-connect when user changes

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => {
  const ctx = useContext(SocketContext)
  if (!ctx) throw new Error('useSocket must be used within SocketProvider')
  return ctx
}
