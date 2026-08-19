import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'

const RegisterForm = () => {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('student')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!name || !email || !password || !role) {
      setError('Please fill in all fields.')
      return
    }

    setSubmitting(true)
    try {
      await register(email, name, password, role)
    } catch (err) {
      setError('Registration failed. Email may already be in use.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: 'hsl(350, 89%, 60%)',
          fontSize: '0.85rem'
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'hsl(var(--text-secondary))' }}>Full Name</label>
        <input
          type="text"
          className="input-field"
          placeholder="Aarav Sharma"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'hsl(var(--text-secondary))' }}>Email Address</label>
        <input
          type="email"
          className="input-field"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'hsl(var(--text-secondary))' }}>Password</label>
        <input
          type="password"
          className="input-field"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.85rem', fontWeight: '500', color: 'hsl(var(--text-secondary))' }}>I am a...</label>
        <select
          className="input-field"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={{ background: 'hsl(var(--bg-tertiary))', border: '1px solid hsl(var(--border-color))' }}
        >
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
        </select>
      </div>

      <button type="submit" className="btn-primary" disabled={submitting} style={{ marginTop: '0.5rem' }}>
        {submitting ? 'Creating Account...' : 'Sign Up'}
      </button>

      <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
        <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>Already have an account? </span>
        <span
          onClick={() => navigate('/login')}
          style={{ fontSize: '0.85rem', color: 'hsl(var(--accent-secondary))', cursor: 'pointer', fontWeight: '500' }}
        >
          Sign In
        </span>
      </div>
    </form>
  )
}

export default RegisterForm
