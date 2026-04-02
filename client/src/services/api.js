import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true, // Send httpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
})

// Inject token from localStorage into every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('voxlink_token')
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

// Handle 401 globally — clear auth and redirect
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('voxlink_token')
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
