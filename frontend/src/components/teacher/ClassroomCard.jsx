import React from 'react'
import { useNavigate } from 'react-router-dom'

const ClassroomCard = ({ classroom }) => {
  const navigate = useNavigate()
  const studentCount = classroom.students?.length || 0

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
          <h3 style={{ fontSize: '1.25rem' }}>{classroom.name}</h3>
          <span style={{
            fontSize: '0.75rem',
            padding: '0.2rem 0.5rem',
            borderRadius: '20px',
            background: 'rgba(99, 102, 241, 0.1)',
            color: 'hsl(var(--accent-primary))',
            fontWeight: '600'
          }}>
            {studentCount} {studentCount === 1 ? 'Student' : 'Students'}
          </span>
        </div>
        <p style={{ fontSize: '0.9rem', color: 'hsl(var(--text-secondary))', minHeight: '40px' }}>
          {classroom.description || 'No description provided.'}
        </p>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '0.5rem',
        borderTop: '1px solid hsl(var(--border-color))',
        paddingTop: '0.75rem'
      }}>
        <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
          Classroom ID: {classroom.id}
        </span>
        <button
          onClick={() => navigate(`/teacher/classroom/${classroom.id}`)}
          className="btn-primary"
          style={{ padding: '0.4rem 0.875rem', fontSize: '0.8rem' }}
        >
          View Dashboard
        </button>
      </div>
    </div>
  )
}

export default ClassroomCard
