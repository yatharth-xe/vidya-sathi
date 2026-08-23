/**
 * AuthContext — single source of truth for authentication state.
 *
 * Session restoration on refresh
 * ───────────────────────────────
 * On mount, if a token exists in localStorage we call GET /auth/me
 * to validate the session with the backend and get the real user role.
 * We never trust the role stored locally from a previous login — the
 * backend is always the authority.
 *
 * Role routing
 * ────────────
 * After login the backend response includes `role`; we navigate based
 * on that value, not on anything the client submitted.
 */
import React, { createContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import authService from '../services/authService'

export const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)   // true while restoring session
  const navigate = useNavigate()

  // ── Session restoration ─────────────────────────────────────────────────
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        setLoading(false)
        return
      }

      try {
        // Validate the stored token against the backend and get real user data.
        // api.js already attaches the token via its request interceptor.
        const response = await api.get('/api/v1/auth/me')
        const backendUser = response.data
        const restoredUser = {
          id: backendUser.id,
          email: backendUser.email,
          name: backendUser.name,
          role: backendUser.role,   // always from backend — never from localStorage
        }
        // Refresh the stored snapshot with backend-confirmed data
        localStorage.setItem('user', JSON.stringify(restoredUser))
        setUser(restoredUser)
      } catch {
        // Token invalid or expired — clean up silently
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    restoreSession()
  }, [])

  // ── Login ───────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    setLoading(true)
    try {
      const data = await authService.login(email, password)
      // Persist the JWT
      localStorage.setItem('token', data.access_token)

      // Build user object from backend response — role comes from the server
      const loggedInUser = {
        id: data.user_id,
        email: data.email,
        name: data.name,
        role: data.role,  // authoritative — never guessed from the email string
      }
      localStorage.setItem('user', JSON.stringify(loggedInUser))
      setUser(loggedInUser)

      // Route by role
      if (loggedInUser.role === 'teacher') {
        navigate('/teacher')
      } else {
        navigate('/student')
      }
      return loggedInUser
    } catch (err) {
      // Clean up on failure
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setUser(null)
      throw err
    } finally {
      setLoading(false)
    }
  }, [navigate])

  // ── Register ────────────────────────────────────────────────────────────
  const register = useCallback(async (email, name, password, role) => {
    setLoading(true)
    try {
      await authService.register(email, name, password, role)
      navigate('/login')
    } finally {
      setLoading(false)
    }
  }, [navigate])

  // ── Logout ──────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    navigate('/login')
  }, [navigate])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
