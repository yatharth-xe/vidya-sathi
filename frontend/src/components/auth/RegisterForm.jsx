/**
 * RegisterForm — name + email + password + role selection.
 * Delegates all auth logic to AuthContext.register().
 * No changes to authentication contracts.
 */
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'

const EyeIcon = ({ open }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true">
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22" />
      </>
    )}
  </svg>
)

const RegisterForm = () => {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState('student')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!name || !email || !password) {
      setError('Please fill in all fields.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setSubmitting(true)
    try {
      await register(email, name, password, role)
    } catch (err) {
      setError(err.message || 'Registration failed. Email may already be in use.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      {error && (
        <div className="alert alert-danger" role="alert">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {/* Full name */}
      <div className="form-field">
        <label htmlFor="reg-name" className="form-label">Full name</label>
        <input
          id="reg-name"
          type="text"
          className="input-field"
          placeholder="Your full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          required
          disabled={submitting}
        />
      </div>

      {/* Email */}
      <div className="form-field">
        <label htmlFor="reg-email" className="form-label">Email address</label>
        <input
          id="reg-email"
          type="email"
          className="input-field"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          disabled={submitting}
        />
      </div>

      {/* Password with toggle */}
      <div className="form-field">
        <label htmlFor="reg-password" className="form-label">Password</label>
        <div style={{ position: 'relative' }}>
          <input
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            className="input-field"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            disabled={submitting}
            style={{ paddingRight: '2.75rem' }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            style={{
              position: 'absolute',
              right: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'hsl(var(--color-text-3))',
              display: 'flex',
              alignItems: 'center',
              padding: '0.25rem',
              borderRadius: 'var(--r-sm)',
            }}
          >
            <EyeIcon open={showPassword} />
          </button>
        </div>
      </div>

      {/* Role selection */}
      <div className="form-field">
        <label htmlFor="reg-role" className="form-label">I am joining as a…</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-2)' }}>
          {['student', 'teacher'].map((r) => (
            <label
              key={r}
              htmlFor={`reg-role-${r}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--sp-2)',
                padding: 'var(--sp-3) var(--sp-4)',
                borderRadius: 'var(--r-md)',
                border: `2px solid ${role === r ? 'hsl(var(--color-primary))' : 'hsl(var(--color-border))'}`,
                background: role === r ? 'hsl(var(--color-primary-dim))' : 'hsl(var(--color-surface-3))',
                cursor: 'pointer',
                transition: 'border-color var(--transition), background var(--transition)',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: role === r ? 'hsl(var(--color-primary-fg))' : 'hsl(var(--color-text-2))',
              }}
            >
              <input
                type="radio"
                id={`reg-role-${r}`}
                name="role"
                value={r}
                checked={role === r}
                onChange={() => setRole(r)}
                className="sr-only"
              />
              <span>{r === 'student' ? '🎓' : '📚'}</span>
              <span style={{ textTransform: 'capitalize' }}>{r}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="btn btn-primary btn-full btn-lg"
        disabled={submitting}
        style={{ marginTop: 'var(--sp-1)' }}
      >
        {submitting ? (
          <>
            <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} aria-hidden="true" />
            Creating account...
          </>
        ) : 'Create account'}
      </button>

      {/* Login link */}
      <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'hsl(var(--color-text-2))' }}>
        Already have an account?{' '}
        <button
          type="button"
          onClick={() => navigate('/login')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'hsl(var(--color-primary))', fontWeight: 600, fontSize: 'inherit',
            fontFamily: 'inherit', padding: 0, borderRadius: 'var(--r-sm)',
          }}
        >
          Sign in
        </button>
      </p>
    </form>
  )
}

export default RegisterForm
