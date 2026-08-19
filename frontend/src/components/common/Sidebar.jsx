import React from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'

const Sidebar = ({ classrooms = [] }) => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { classId } = useParams()

  const isTeacher = user?.role === 'teacher'
  const activeClassroomId = classId ? parseInt(classId) : null

  return (
    <aside style={{
      width: '260px',
      background: 'hsl(var(--bg-secondary))',
      borderRight: '1px solid hsl(var(--border-color))',
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 68px)',
      position: 'sticky',
      top: '68px',
      padding: '1.5rem 1rem'
    }}>
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => navigate(isTeacher ? '/teacher' : '/student')}
          className="btn-primary"
          style={{
            width: '100%',
            background: location.pathname === '/teacher' || location.pathname === '/student' ? undefined : 'transparent',
            border: location.pathname === '/teacher' || location.pathname === '/student' ? undefined : '1px solid hsl(var(--border-color))',
            color: location.pathname === '/teacher' || location.pathname === '/student' ? undefined : 'hsl(var(--text-primary))',
            justifyContent: 'flex-start'
          }}
        >
          Dashboard Overview
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', paddingLeft: '0.5rem', marginBottom: '0.5rem' }}>
          My Classrooms
        </span>

        {classrooms.length === 0 ? (
          <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', paddingLeft: '0.5rem', fontStyle: 'italic' }}>
            No classrooms found.
          </span>
        ) : (
          classrooms.map((c) => (
            <div
              key={c.id}
              onClick={() => navigate(`/${isTeacher ? 'teacher' : 'student'}/classroom/${c.id}`)}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                transition: 'all 0.2s',
                background: activeClassroomId === c.id ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                borderLeft: activeClassroomId === c.id ? '3px solid hsl(var(--accent-primary))' : '3px solid transparent',
                color: activeClassroomId === c.id ? 'hsl(var(--text-primary))' : 'hsl(var(--text-secondary))'
              }}
            >
              {c.name}
            </div>
          ))
        )}
      </div>

      <div style={{
        paddingTop: '1rem',
        borderTop: '1px solid hsl(var(--border-color))',
        fontSize: '0.8rem',
        color: 'hsl(var(--text-muted))',
        textAlign: 'center'
      }}>
        Vidya Sathi v0.1.0
      </div>
    </aside>
  )
}

export default Sidebar
