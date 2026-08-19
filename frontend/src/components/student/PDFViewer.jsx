import React from 'react'

const PDFViewer = ({ title, fileUrl }) => {
  return (
    <div className="glass-panel" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '500px',
      overflow: 'hidden',
      background: 'hsl(var(--bg-secondary))'
    }}>
      <div style={{
        padding: '0.75rem 1rem',
        background: 'rgba(255, 255, 255, 0.03)',
        borderBottom: '1px solid hsl(var(--border-color))',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{title || 'Document Resource'}</span>
        <a
          href={fileUrl ? `/api/v1/uploads/${fileUrl.split('/').pop()}` : '#'}
          download
          target="_blank"
          rel="noreferrer"
          className="btn-primary"
          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
        >
          Download PDF
        </a>
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0d0f17',
        color: 'hsl(var(--text-muted))',
        position: 'relative'
      }}>
        {fileUrl ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
            <p style={{ fontSize: '0.95rem', color: 'hsl(var(--text-secondary))', marginBottom: '0.5rem' }}>
              Resource Document Loaded
            </p>
            <span style={{ fontSize: '0.75rem' }}>{fileUrl.split('/').pop()}</span>
          </div>
        ) : (
          <p style={{ fontSize: '0.9rem' }}>No PDF resource attached to this assignment.</p>
        )}
      </div>
    </div>
  )
}

export default PDFViewer
