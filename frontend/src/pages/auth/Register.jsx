/**
 * Register page — same two-column auth layout as Login.
 */
import React from 'react'
import RegisterForm from '../../components/auth/RegisterForm'

const Register = () => (
  <div className="auth-page">
    {/* Brand panel */}
    <div className="auth-brand-panel">
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
        }}>
          Vidya Sathi
        </span>
      </div>

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
        Join thousands of learners and educators.
      </h1>

      <p style={{
        fontSize: '0.9375rem',
        color: 'hsl(var(--color-text-2))',
        lineHeight: 1.65,
        maxWidth: 360,
        marginBottom: 'var(--sp-10)',
      }}>
        Whether you're a student ready to learn smarter or a teacher looking for real insight into your classroom — Vidya Sathi is built for you.
      </p>

      {/* Role explainer */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
        {[
          { icon: '🎓', role: 'Student', desc: 'Access classrooms, submit assignments, practice with AI, and track your progress.' },
          { icon: '📚', role: 'Teacher', desc: 'Create classrooms, publish assignments, and get AI-generated insights on student performance.' },
        ].map((r) => (
          <div key={r.role} style={{
            display: 'flex',
            gap: 'var(--sp-3)',
            padding: 'var(--sp-4)',
            borderRadius: 'var(--r-lg)',
            background: 'hsl(var(--color-surface-2))',
            border: '1px solid hsl(var(--color-border))',
          }}>
            <span style={{ fontSize: '1.25rem', flexShrink: 0 }} aria-hidden="true">{r.icon}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 2 }}>{r.role}</div>
              <div style={{ fontSize: '0.8125rem', color: 'hsl(var(--color-text-2))', lineHeight: 1.5 }}>{r.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Form panel */}
    <div className="auth-form-panel">
      <div className="auth-card">
        {/* Mobile brand */}
        <div className="auth-mobile-brand" style={{ marginBottom: 'var(--sp-6)', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            gap: 'var(--sp-2)', marginBottom: 'var(--sp-1)',
          }}>
            <div style={{
              width: 28, height: 28,
              borderRadius: 'var(--r-md)',
              background: 'hsl(var(--color-primary))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </div>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 800,
              fontSize: '1.125rem', color: 'hsl(var(--color-text))',
            }}>Vidya Sathi</span>
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
            Create your account
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'hsl(var(--color-text-2))' }}>
            Get started with Vidya Sathi today.
          </p>
        </div>

        <RegisterForm />
      </div>
    </div>

    <style>{`
      @media (min-width: 1024px) {
        .auth-mobile-brand { display: none; }
      }
    `}</style>
  </div>
)

export default Register
