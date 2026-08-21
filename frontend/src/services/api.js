/**
 * Axios singleton — the single place where the backend URL and auth
 * headers are configured. Every service file imports from here.
 *
 * Base URL priority:
 *   1. VITE_API_BASE_URL environment variable (set in .env)
 *   2. Empty string fallback → Vite dev-server proxy handles /api/* → localhost:8000
 *
 * Authorization:
 *   JWT is read from localStorage and attached automatically to every request.
 *
 * Error handling:
 *   - 401 Unauthorized → clear stored session, redirect to /login
 *   - 403 Forbidden    → re-throw with readable message
 *   - 404 Not Found    → re-throw with readable message
 *   - 5xx Server Error → re-throw with readable message
 *   - Network failure  → re-throw with readable message
 */
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 s — surface network failures promptly
})

// ── Request interceptor: attach JWT ────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor: normalise errors ─────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      // Network failure or timeout — no HTTP status at all
      return Promise.reject(
        new Error('Network error — please check your connection and try again.')
      )
    }

    const { status, data } = error.response
    const detail = data?.detail || data?.message || ''

    switch (status) {
      case 401:
        // Session expired or invalid token — clear state and redirect
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        // Only redirect if not already on the login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
        return Promise.reject(new Error('Session expired. Please log in again.'))

      case 403:
        return Promise.reject(
          new Error(detail || 'You do not have permission to perform this action.')
        )

      case 404:
        return Promise.reject(
          new Error(detail || 'The requested resource was not found.')
        )

      case 422:
        // FastAPI validation error — detail is usually an array
        if (Array.isArray(data?.detail)) {
          const msgs = data.detail.map((e) => e.msg).join('; ')
          return Promise.reject(new Error(`Validation error: ${msgs}`))
        }
        return Promise.reject(new Error(detail || 'Invalid request data.'))

      case 500:
      case 502:
      case 503:
        return Promise.reject(
          new Error('Server error — please try again later.')
        )

      default:
        return Promise.reject(
          new Error(detail || `Unexpected error (HTTP ${status}).`)
        )
    }
  }
)

export default api
