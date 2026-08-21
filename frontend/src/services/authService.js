/**
 * Auth service — wraps all authentication-related API calls.
 *
 * login()    → POST /api/v1/auth/login   (form-encoded, FastAPI OAuth2 format)
 * register() → POST /api/v1/auth/register
 * getMe()    → GET  /api/v1/auth/me      (validate current JWT, get real user data)
 */
import api from './api'

const authService = {
  /**
   * Authenticate with email + password.
   * FastAPI's OAuth2PasswordRequestForm expects form-encoded body.
   */
  login: async (email, password) => {
    const params = new URLSearchParams()
    params.append('username', email)  // FastAPI expects 'username' field
    params.append('password', password)

    const response = await api.post('/api/v1/auth/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    return response.data
    // Returns: { access_token, token_type, user_id, name, email, role }
  },

  /**
   * Register a new user account.
   */
  register: async (email, name, password, role) => {
    const response = await api.post('/api/v1/auth/register', {
      email,
      name,
      password,
      role,
    })
    return response.data
    // Returns: { id, email, name, role, created_at }
  },

  /**
   * Validate the current JWT and return the real user from the backend.
   * Used by AuthContext on page refresh to confirm the session is valid
   * and to get the authoritative role — never trust localStorage role alone.
   */
  getMe: async () => {
    const response = await api.get('/api/v1/auth/me')
    return response.data
    // Returns: { id, email, name, role, created_at }
  },
}

export default authService
