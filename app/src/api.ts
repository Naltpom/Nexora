import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { PUBLIC_PATHS } from './core/routes'

// ── In-memory token store ──────────────────────────────────────────
// The access_token lives in JS memory only (not localStorage).
// On page reload it is lost → silent refresh via HttpOnly cookie.
let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

export function clearAccessToken() {
  accessToken = null
}

// ── Axios instance ─────────────────────────────────────────────────
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

// Request interceptor: attach JWT from memory + handle FormData content-type
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  // Let the browser set the correct Content-Type (with boundary) for FormData
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

// ── Refresh mutex: prevents concurrent refresh calls ─────────────
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (token) resolve(token)
    else reject(error)
  })
  failedQueue = []
}

// Response interceptor: handle 401 + token refresh with mutex
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    if (!originalRequest) return Promise.reject(error)

    const isAuthRoute =
      originalRequest.url?.startsWith('/auth/login') ||
      originalRequest.url?.startsWith('/auth/register')

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true

      // If a refresh is already in progress, queue this request
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }

      isRefreshing = true
      try {
        // Cookie is sent automatically (withCredentials + Path=/api/auth)
        const response = await axios.post('/api/auth/refresh', {}, { withCredentials: true })
        const { access_token } = response.data
        setAccessToken(access_token)
        processQueue(null, access_token)
        originalRequest.headers.Authorization = `Bearer ${access_token}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        // Don't clear a token that was set by a concurrent login
        if (!accessToken) {
          clearAccessToken()
          // Only hard-redirect if not already on a public page
          if (!PUBLIC_PATHS.some((p) => window.location.pathname.startsWith(p))) {
            window.location.href = '/login'
          }
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

/**
 * Parse API error detail into a displayable string.
 * Handles both string detail (FastAPI HTTPException) and array detail (Pydantic 422).
 */
export function parseApiError(err: any, fallback: string): string {
  const detail = err?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((e: any) => {
        const msg: string = e.msg || ''
        return msg.replace(/^Value error, /i, '')
      })
      .join('. ')
  }
  return fallback
}

export default api
