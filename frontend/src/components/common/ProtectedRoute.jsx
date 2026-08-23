import React from 'react'
import { Navigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'
import Loader from './Loader'

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return <Loader fullPage />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their default dashboard
    return <Navigate to={user.role === 'teacher' ? '/teacher' : '/student'} replace />
  }

  return children
}

export default ProtectedRoute
