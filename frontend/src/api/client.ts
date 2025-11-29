import axios from 'axios'

// Create the main API instance
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

// In-memory access token storage
let accessToken: string | null = null

export const setAccessToken = (token: string | null) => {
  accessToken = token
}

export const getAccessToken = () => accessToken

export const clearTokens = () => {
  accessToken = null
  // Broadcast logout to other tabs
  broadcastAuthEvent('logout')
}

// Broadcast Channel for cross-tab communication
const authChannel = typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('auth_channel')
  : null

type AuthEventType = 'logout' | 'login'

const broadcastAuthEvent = (type: AuthEventType) => {
  if (authChannel) {
    authChannel.postMessage({ type, timestamp: Date.now() })
  }
}

// Listen for auth events from other tabs
if (authChannel) {
  authChannel.onmessage = (event: MessageEvent<{ type: AuthEventType; timestamp: number }>) => {
    if (event.data.type === 'logout') {
      // Clear tokens in this tab
      accessToken = null

      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login') &&
        !window.location.pathname.includes('/signup') &&
        !window.location.pathname.includes('/home')) {
        window.location.href = '/login'
      }
    }
  }
}

// Request interceptor to attach access token
api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor to handle token refresh
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: unknown) => void
  reject: (reason?: unknown) => void
}> = []

const processQueue = (error: unknown = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve()
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // If error is 401
    if (error.response?.status === 401) {
      const url: string = originalRequest?.url ?? ''

      // Do not attempt refresh/redirect for auth endpoints themselves
      const isLoginEndpoint = url.includes('/auth/login')
      const isRefreshEndpoint = url.includes('/auth/refresh')

      if (isLoginEndpoint || isRefreshEndpoint) {
        return Promise.reject(error)
      }

      // If we haven't tried to refresh yet
      if (!originalRequest._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject })
          })
            .then(() => api(originalRequest))
            .catch((err) => Promise.reject(err))
        }

        originalRequest._retry = true
        isRefreshing = true

        try {
          const { data } = await axios.post(
            `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/auth/refresh`,
            {},
            { withCredentials: true }
          )

          setAccessToken(data.accessToken)
          processQueue()
          isRefreshing = false

          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
          return api(originalRequest)
        } catch (refreshError) {
          processQueue(refreshError)
          clearTokens()
          isRefreshing = false
          window.location.href = '/login'
          return Promise.reject(refreshError)
        }
      }
    }

    return Promise.reject(error)
  }
)

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (authChannel) {
    authChannel.close()
  }
})