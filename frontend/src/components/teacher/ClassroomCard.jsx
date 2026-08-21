/**
 * Teacher ClassroomCard — shows classroom name, student count, description.
 * Navigates to the classroom detail page on click.
 */
import React from 'react'
import { useNavigate } from 'react-router-dom'

const ClassroomCard = ({ classroom }) => {
  const navigate = useNavigate()
  const studentCount = classroom.students?.length ?? 0
  const assignmentCount = classroom.assignments?.length ?? 0

  return (
    <article
      className="card card-interactive"
      style={{ padding: 'var(--sp-5)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}
      onClick={() => navigate(`/teacher/classroom/${classroom.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/teacher/classroom/${classroom.id}`)}
      aria-label={`Classroom: ${classroom.name}. ${studentCount} students, ${assignmentCount} assignments.`}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--sp-3)' }}>
        {/* Icon + title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-3)', flex: 1, minWidth: 0 }}>
          <div style={{
            width: 40, height: 40,
            borderRadius: 'var(--r-md)',
            background: 'hsl(var(--color-primary-dim))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }} aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="hsl(var(--color-primary-fg))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
              <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
            </svg>
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: 'hsl(var(--color-text))',
              marginBottom: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {classroom.name}
            </h3>
            <p style={{
              fontSize: '0.8125rem',
              color: 'hsl(var(--color-text-3))',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              ID: {classroom.id}
            </p>
          </div>
        </div>
      </div>

      {/* Description */}
      <p style={{
        fontSize: '0.875rem',
        color: 'hsl(var(--color-text-2))',
        lineHeight: 1.55,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        minHeight: '2.7em',
      }}>
        {classroom.description || 'No description provided.'}
      </p>

      {/* Footer stats */}
      <div style={{
        display: 'flex',
        gap: 'var(--sp-4)',
        paddingTop: 'var(--sp-3)',
        borderTop: '1px solid hsl(var(--color-border))',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="hsl(var(--color-text-3))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
          </svg>
          <span style={{ fontSize: '0.8125rem', color: 'hsl(var(--color-text-3))' }}>
            {studentCount} {studentCount === 1 ? 'student' : 'students'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="hsl(var(--color-text-3))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="2" />
          </svg>
          <span style={{ fontSize: '0.8125rem', color: 'hsl(var(--color-text-3))' }}>
            {assignmentCount} {assignmentCount === 1 ? 'assignment' : 'assignments'}
          </span>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'hsl(var(--color-primary))',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            Open
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </article>
  )
}

export default ClassroomCard
