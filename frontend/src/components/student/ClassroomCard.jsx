import React from 'react'
import { useNavigate } from 'react-router-dom'

const ClassroomCard = ({ classroom }) => {
  const navigate = useNavigate()

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{classroom.name}</h3>
        <p style={{ fontSize: '0.9rem', color: 'hsl(var(--text-secondary))', minHeight: '40px' }}>
          {classroom.description || 'No description provided.'}
        </p>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '0.5rem',
        borderTop: '1px solid hsl(var(--border-color))',
        paddingTop: '0.75rem',
        fontSize: '0.85rem'
      }}>
        <span style={{ color: 'hsl(var(--text-muted))' }}>
          Teacher: <strong style={{ color: 'hsl(var(--text-primary))' }}>{classroom.teacher?.name || 'Tutor'}</strong>
        </span>
        <button
          onClick={() => navigate(`/student/classroom/${classroom.id}`)}
          className="btn-primary"
          style={{ padding: '0.4rem 0.875rem', fontSize: '0.8rem' }}
        >
          Enter Class
        </button>
      </div>
    </div>
  )
}

export default ClassroomCard
