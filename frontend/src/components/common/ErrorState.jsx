/**
 * ErrorState — displays a recoverable error with optional retry.
 * Replaces the old ErrorMessage component.
 *
 * Props:
 *   message  {string}   — human-readable error text
 *   onRetry  {function} — if provided, shows a Retry button
 */
import React from 'react'

const ErrorState = ({ message = 'Something went wrong. Please try again.', onRetry }) => (
  <div
    className="alert alert-danger"
    style={{
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 'var(--sp-3)',
      borderRadius: 'var(--r-lg)',
      padding: 'var(--sp-5)',
      maxWidth: 520,
      margin: 'var(--sp-8) auto',
    }}
    role="alert"
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Error</span>
    </div>
    <p style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>{message}</p>
    {onRetry && (
      <button onClick={onRetry} className="btn btn-ghost btn-sm">
        Try again
      </button>
    )}
  </div>
)

export default ErrorState
