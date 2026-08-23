import React from 'react'

const WeakTopicTable = ({ topics = [] }) => {
  return (
    <div className="glass-panel" style={{ padding: '1.5rem', overflow: 'hidden' }}>
      <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Identified Weak Concepts</h3>

      {topics.length === 0 ? (
        <p style={{ fontSize: '0.9rem', color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>
          No weak topics identified yet.
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid hsl(var(--border-color))' }}>
              <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase' }}>Concept / Topic</th>
              <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', textAlign: 'right' }}>Understanding Level</th>
            </tr>
          </thead>
          <tbody>
            {topics.map((topic, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>{topic}</td>
                <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.9rem', textAlign: 'right', color: 'hsl(350, 89%, 60%)', fontWeight: '600' }}>
                  Below 60%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default WeakTopicTable
