import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import AppPage from './pages/AppPage.jsx'
import { IncomingCallModal } from './components/IncomingCallModal.jsx'

// Protected route wrapper
const Protected = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-900">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  return user ? (
    <>
      {children}
      <IncomingCallModal />
    </>
  ) : (
    <Navigate to="/login" replace />
  )
}

const App = () => {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/app" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/app" replace /> : <Register />} />
      <Route path="/app" element={<Protected><AppPage /></Protected>} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  )
}

export default App
