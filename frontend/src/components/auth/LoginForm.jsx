/**
 * LoginForm — email + password form.
 * Delegates all auth logic to AuthContext.login().
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

const LoginForm = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }

    setSubmitting(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err.message || 'Invalid email or password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
      {error && (
        <div className="alert alert-danger" role="alert">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {/* Email */}
      <div className="form-field">
        <label htmlFor="login-email" className="form-label">Email address</label>
        <input
          id="login-email"
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
        <label htmlFor="login-password" className="form-label">Password</label>
        <div style={{ position: 'relative' }}>
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            className="input-field"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
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
            Signing in...
          </>
        ) : 'Sign in'}
      </button>

      {/* Register link */}
      <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'hsl(var(--color-text-2))' }}>
        Don't have an account?{' '}
        <button
          type="button"
          onClick={() => navigate('/register')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'hsl(var(--color-primary))', fontWeight: 600, fontSize: 'inherit',
            fontFamily: 'inherit', padding: 0, borderRadius: 'var(--r-sm)',
          }}
        >
          Sign up
        </button>
      </p>
    </form>
  )
}

export default LoginForm
