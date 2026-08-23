/**
 * Login page — two-column layout on desktop, single column on mobile.
 * Left: brand panel with value proposition.
 * Right: login form card.
 */
import React from 'react'
import LoginForm from '../../components/auth/LoginForm'

const FEATURES = [
  { icon: '🧠', text: 'AI-powered doubt resolution for every student' },
  { icon: '📊', text: 'Real-time insights and weak topic detection for teachers' },
  { icon: '🎯', text: 'Personalised practice paths and quiz feedback' },
  { icon: '🔒', text: 'Private classroom spaces with secure access' },
]

const Login = () => (
  <div className="auth-page">
    {/* Brand panel — visible on large screens */}
    <div className="auth-brand-panel">
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', marginBottom: 'var(--sp-12)' }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 'var(--r-lg)',
          background: 'hsl(var(--color-primary))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
        </div>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: '1.375rem',
          color: 'hsl(var(--color-text))',
          letterSpacing: '-0.02em',
        }}>
          Vidya Sathi
        </span>
      </div>

      {/* Headline */}
      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '2rem',
        fontWeight: 800,
        lineHeight: 1.2,
        letterSpacing: '-0.025em',
        color: 'hsl(var(--color-text))',
        marginBottom: 'var(--sp-4)',
        maxWidth: 380,
      }}>
        Your AI learning companion and teacher intelligence platform.
      </h1>

      <p style={{
        fontSize: '0.9375rem',
        color: 'hsl(var(--color-text-2))',
        lineHeight: 1.65,
        maxWidth: 360,
        marginBottom: 'var(--sp-10)',
      }}>
        Vidya Sathi brings together students and teachers in a smart learning environment — with AI that understands where each student is and what they need next.
      </p>

      {/* Feature list */}
      <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', listStyle: 'none' }}>
        {FEATURES.map((f) => (
          <li key={f.text} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-3)' }}>
            <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: 1 }} aria-hidden="true">{f.icon}</span>
            <span style={{ fontSize: '0.875rem', color: 'hsl(var(--color-text-2))', lineHeight: 1.5 }}>
              {f.text}
            </span>
          </li>
        ))}
      </ul>
    </div>

    {/* Form panel */}
    <div className="auth-form-panel">
      <div className="auth-card">
        {/* Mobile brand (only on mobile when brand panel is hidden) */}
        <div className="auth-mobile-brand" style={{ marginBottom: 'var(--sp-6)', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--sp-2)',
            marginBottom: 'var(--sp-1)',
          }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: 'var(--r-md)',
              background: 'hsl(var(--color-primary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </div>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: '1.125rem',
              color: 'hsl(var(--color-text))',
            }}>
              Vidya Sathi
            </span>
          </div>
        </div>

        <div style={{ marginBottom: 'var(--sp-6)' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.375rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            marginBottom: 'var(--sp-1)',
          }}>
            Welcome back
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'hsl(var(--color-text-2))' }}>
            Sign in to continue your learning journey.
          </p>
        </div>

        <LoginForm />
      </div>
    </div>

    <style>{`
      @media (min-width: 1024px) {
        .auth-mobile-brand { display: none; }
      }
    `}</style>
  </div>
)

export default Login
