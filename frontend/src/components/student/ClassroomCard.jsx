/**
 * Student ClassroomCard — classroom entry card.
 * Shows classroom name, teacher, description. Navigates into classroom.
 */
import React from 'react'
import { useNavigate } from 'react-router-dom'

const ClassroomCard = ({ classroom }) => {
  const navigate = useNavigate()

  return (
    <article
      className="card card-interactive"
      style={{ padding: 'var(--sp-5)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}
      onClick={() => navigate(`/student/classroom/${classroom.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/student/classroom/${classroom.id}`)}
      aria-label={`Enter ${classroom.name}. Taught by ${classroom.teacher?.name ?? 'your teacher'}.`}
    >
      {/* Icon + title */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-3)' }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 'var(--r-md)',
          background: 'hsl(var(--color-primary-dim))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }} aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="hsl(var(--color-primary-fg))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
            <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
          </svg>
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: 'hsl(var(--color-text))',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {classroom.name}
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'hsl(var(--color-text-3))' }}>
            {classroom.teacher?.name ? `Taught by ${classroom.teacher.name}` : 'Classroom'}
          </p>
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
        {classroom.description || 'Enter this classroom to view your assignments.'}
      </p>

      {/* Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 'var(--sp-3)',
        borderTop: '1px solid hsl(var(--color-border))',
      }}>
        <span style={{ fontSize: '0.8125rem', color: 'hsl(var(--color-text-3))' }}>
          {classroom.assignments?.length ?? 0} assignments
        </span>
        <span style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'hsl(var(--color-primary))',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}>
          Enter class
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </article>
  )
}

export default ClassroomCard
