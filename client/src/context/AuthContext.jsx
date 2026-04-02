import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api.js'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('voxlink_token')
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      api.get('/api/auth/me')
        .then(({ data }) => setUser(data.user))
        .catch(() => {
          localStorage.removeItem('voxlink_token')
          delete api.defaults.headers.common['Authorization']
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password })
    localStorage.setItem('voxlink_token', data.token)
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
    setUser(data.user)
    return data.user
  }

  const register = async (username, email, password) => {
    const { data } = await api.post('/api/auth/register', { username, email, password })
    localStorage.setItem('voxlink_token', data.token)
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
    setUser(data.user)
    return data.user
  }

  const logout = async () => {
    try {
      await api.post('/api/auth/logout')
    } catch {}
    localStorage.removeItem('voxlink_token')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
  }

  const getToken = () => localStorage.getItem('voxlink_token')

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
