/**
 * TopNav — sticky top navigation bar.
 * Shows brand name, hamburger (mobile), user avatar + name, logout.
 */
import React from 'react'
import useAuth from '../../hooks/useAuth'
import { getInitials } from '../../utils/helpers'

// Simple SVG icons (inline — no external icon library needed)
const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
)

const TopNav = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth()

  return (
    <header
      style={{
        height: 'var(--topnav-height)',
        background: 'hsl(var(--color-surface))',
        borderBottom: '1px solid hsl(var(--color-border))',
        display: 'flex',
        alignItems: 'center',
        padding: '0 var(--sp-6)',
        gap: 'var(--sp-4)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        flexShrink: 0,
      }}
    >
      {/* Hamburger — mobile only */}
      <button
        className="btn btn-ghost btn-icon"
        onClick={onToggleSidebar}
        aria-label="Toggle navigation menu"
        style={{ display: 'none', '@media (max-width: 768px)': { display: 'flex' } }}
      >
        <MenuIcon />
      </button>
      <style>{`
        @media (max-width: 768px) {
          .topnav-hamburger { display: inline-flex !important; }
        }
      `}</style>
      <button
        className="btn btn-ghost btn-icon topnav-hamburger"
        onClick={onToggleSidebar}
        aria-label="Toggle navigation menu"
        style={{ display: 'none' }}
      >
        <MenuIcon />
      </button>

      {/* Brand */}
      <a
        href="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--sp-2)',
          textDecoration: 'none',
        }}
        aria-label="Vidya Sathi home"
      >
        {/* Brand mark */}
        <div style={{
          width: 30,
          height: 30,
          borderRadius: 'var(--r-md)',
          background: 'hsl(var(--color-primary))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
        </div>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: '1.125rem',
            letterSpacing: '-0.02em',
            color: 'hsl(var(--color-text))',
          }}
        >
          Vidya Sathi
        </span>
      </a>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Right side: user info + logout */}
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
          {/* Role badge */}
          <span
            className={`badge ${user.role === 'teacher' ? 'badge-amber' : 'badge-primary'}`}
            style={{ textTransform: 'capitalize' }}
          >
            {user.role}
          </span>

          {/* Avatar + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <div
              className={`avatar avatar-md ${user.role === 'teacher' ? 'avatar-amber' : 'avatar-primary'}`}
              aria-hidden="true"
            >
              {getInitials(user.name)}
            </div>
            <span
              style={{
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'hsl(var(--color-text))',
                maxWidth: 140,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              className="topnav-name"
            >
              {user.name}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="btn btn-ghost btn-sm"
            aria-label="Log out"
          >
            Sign out
          </button>
        </div>
      )}

      <style>{`
        @media (max-width: 500px) {
          .topnav-name { display: none; }
        }
      `}</style>
    </header>
  )
}

export default TopNav
