import React from 'react'
import useAuth from '../../hooks/useAuth'
import { getInitials } from '../../utils/helpers'

const Navbar = () => {
  const { user, logout } = useAuth()

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'between',
      justifyContent: 'space-between',
      padding: '1rem 2rem',
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--glass-border)',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span className="gradient-text" style={{ fontSize: '1.5rem', fontWeight: '800', fontFamily: 'var(--font-display)' }}>
          Vidya Sathi
        </span>
        <span style={{
          fontSize: '0.7rem',
          padding: '0.2rem 0.5rem',
          borderRadius: '20px',
          background: 'rgba(255, 255, 255, 0.08)',
          color: 'hsl(var(--text-secondary))',
          fontWeight: '500'
        }}>
          Co-Pilot
        </span>
      </div>

      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, hsl(var(--accent-primary)) 0%, hsl(var(--accent-secondary)) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.9rem',
              fontWeight: '600',
              color: '#fff'
            }}>
              {getInitials(user.name)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{user.name}</span>
              <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', textTransform: 'capitalize' }}>
                {user.role}
              </span>
            </div>
          </div>

          <button onClick={logout} className="btn-primary" style={{
            padding: '0.5rem 1rem',
            fontSize: '0.85rem',
            background: 'transparent',
            border: '1px solid hsl(var(--border-color))',
            color: 'hsl(var(--text-primary))'
          }}>
            Logout
          </button>
        </div>
      )}
    </nav>
  )
}

export default Navbar
