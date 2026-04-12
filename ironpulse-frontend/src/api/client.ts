import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const baseURL = import.meta.env.VITE_API_URL || '/api/v1'

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

let activeRequests = 0
const startLoader = () => {
  activeRequests++
  window.dispatchEvent(new CustomEvent('ironpulse:api_start'))
}
const stopLoader = () => {
  if (activeRequests > 0) activeRequests--
  if (activeRequests === 0) window.dispatchEvent(new CustomEvent('ironpulse:api_stop'))
}

// ── Request interceptor: attach access token ─────────
api.interceptors.request.use((config) => {
  startLoader()
  const { accessToken } = useAuthStore.getState()
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
}, (error) => {
  stopLoader()
  return Promise.reject(error)
})

// ── Response interceptor: auto-refresh on 401 ────────
api.interceptors.response.use(
  (res) => {
    stopLoader()
    return res
  },
  async (error) => {
    stopLoader()
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      const { refreshToken, setTokens, logout } = useAuthStore.getState()
      
      if (refreshToken) {
        try {
          // Direct axios call to avoid interceptor loop
          const response = await axios.post(`${baseURL}/auth/refresh`, {
            refresh_token: refreshToken,
          })
          
          const newAccess = response.data.access_token
          const newRefresh = response.data.refresh_token || refreshToken
          
          setTokens(newAccess, newRefresh)
          
          originalRequest.headers.Authorization = `Bearer ${newAccess}`
          return api(originalRequest)
        } catch {
          // Refresh failed
          logout()
          window.location.href = '/sign-in'
        }
      } else {
        // No refresh token available
        logout()
        window.location.href = '/sign-in'
      }
    }
    return Promise.reject(error)
  }
)

export default api
