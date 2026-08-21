/**
 * Loader — page and inline loading states.
 * Uses CSS-based spinner with design token colors.
 *
 * Props:
 *   fullPage {boolean} — centers spinner in full viewport
 *   message  {string}  — optional text below spinner
 *   size     {string}  — 'sm' | 'md' (default)
 */
import React from 'react'

const Loader = ({ fullPage = false, message = 'Loading...', size = 'md' }) => {
  const spinner = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-3)' }}>
      <div className={`spinner${size === 'lg' ? ' spinner-lg' : ''}`} role="status" aria-label={message} />
      {message && (
        <span style={{ fontSize: '0.875rem', color: 'hsl(var(--color-text-3))' }}>
          {message}
        </span>
      )}
    </div>
  )

  if (fullPage) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'hsl(var(--color-bg))',
      }}>
        {spinner}
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--sp-12)',
      width: '100%',
    }}>
      {spinner}
    </div>
  )
}

export default Loader
