import React from 'react'

const ErrorMessage = ({ message = 'An unexpected error occurred.', onRetry }) => {
  return (
    <div className="glass-panel" style={{
      padding: '1.5rem',
      maxWidth: '500px',
      margin: '2rem auto',
      textAlign: 'center',
      borderLeft: '4px solid hsl(350, 89%, 60%)'
    }}>
      <h3 style={{ color: 'hsl(350, 89%, 60%)', marginBottom: '0.5rem' }}>Error</h3>
      <p style={{ color: 'hsl(var(--text-secondary))', marginBottom: '1.5rem', fontSize: '0.95rem' }}>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
          Retry
        </button>
      )}
    </div>
  )
}

export default ErrorMessage
