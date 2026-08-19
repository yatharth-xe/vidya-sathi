import React, { createContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import authService from '../services/authService'

export const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    if (storedUser && token) {
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    setLoading(true)
    try {
      const data = await authService.login(email, password)
      localStorage.setItem('token', data.access_token)
      
      const loggedInUser = {
        id: data.user_id || 1,
        email: data.email || email,
        name: data.name || email.split('@')[0],
        role: data.role || (email.includes('teacher') ? 'teacher' : 'student')
      }
      localStorage.setItem('user', JSON.stringify(loggedInUser))
      setUser(loggedInUser)
      
      if (loggedInUser.role === 'teacher') {
        navigate('/teacher')
      } else {
        navigate('/student')
      }
      return loggedInUser
    } catch (err) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setUser(null)
      throw err;
    } finally {
      setLoading(false)
    }
  }

  const register = async (email, name, password, role) => {
    setLoading(true)
    try {
      await authService.register(email, name, password, role)
      navigate('/login')
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    navigate('/login')
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
