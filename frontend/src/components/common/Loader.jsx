import React from 'react'

const Loader = ({ fullPage = false }) => {
  const spinner = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid rgba(255, 255, 255, 0.05)',
        borderTop: '3px solid hsl(262, 83%, 58%)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <span style={{ fontSize: '0.9rem', color: 'hsl(var(--text-secondary))', fontFamily: 'var(--font-sans)' }}>
        Loading Vidya Sathi...
      </span>
    </div>
  )

  if (fullPage) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'hsl(var(--bg-primary))'
      }}>
        {spinner}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', padding: '2rem', width: '100%', justifyContent: 'center' }}>
      {spinner}
    </div>
  )
}

export default Loader
