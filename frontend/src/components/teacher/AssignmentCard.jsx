/**
 * Teacher AssignmentCard — displays assignment title, submission count, due date.
 * Navigates to manage/grade view on button click.
 */
import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { formatDate } from '../../utils/helpers'

const AssignmentCard = ({ assignment }) => {
  const { classId } = useParams()
  const navigate = useNavigate()
  const submissionsCount = assignment.submissions?.length ?? 0

  return (
    <article
      className="card"
      style={{ padding: 'var(--sp-4)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}
    >
      {/* Title + badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--sp-2)' }}>
        <h4 style={{
          fontSize: '0.9375rem',
          fontWeight: 600,
          color: 'hsl(var(--color-text))',
          lineHeight: 1.35,
          flex: 1,
        }}>
          {assignment.title}
        </h4>
        <span className="badge badge-primary" style={{ flexShrink: 0 }}>
          {submissionsCount} {submissionsCount === 1 ? 'submission' : 'submissions'}
        </span>
      </div>

      {/* Description */}
      {assignment.description && (
        <p style={{
          fontSize: '0.8125rem',
          color: 'hsl(var(--color-text-2))',
          lineHeight: 1.5,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {assignment.description}
        </p>
      )}

      {/* Footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 'var(--sp-2)',
        borderTop: '1px solid hsl(var(--color-border))',
      }}>
        <span style={{ fontSize: '0.75rem', color: 'hsl(var(--color-text-3))' }}>
          Due: {formatDate(assignment.due_date)}
        </span>
        <button
          onClick={() => navigate(`/teacher/classroom/${classId}/assignment/${assignment.id}`)}
          className="btn btn-ghost btn-sm"
          aria-label={`Manage and grade ${assignment.title}`}
        >
          Manage & grade
        </button>
      </div>
    </article>
  )
}

export default AssignmentCard
