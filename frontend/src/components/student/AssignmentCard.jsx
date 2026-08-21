/**
 * Student AssignmentCard — shows assignment status, due date, grade.
 * Uses student-friendly language (no "weak", "at risk").
 * Navigates to assignment page on button click.
 */
import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { formatDate } from '../../utils/helpers'

const STATUS_CONFIG = {
  graded: {
    label: 'Graded',
    badgeClass: 'badge-success',
  },
  submitted: {
    label: 'Submitted',
    badgeClass: 'badge-primary',
  },
  pending: {
    label: 'Not started',
    badgeClass: 'badge-warning',
  },
}

const AssignmentCard = ({ assignment }) => {
  const { classId } = useParams()
  const navigate = useNavigate()

  const submission = assignment.submissions?.[0]
  const statusKey = submission ? submission.status : 'pending'
  const grade = submission?.grade ?? null
  const config = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.pending

  return (
    <article
      className="card"
      style={{ padding: 'var(--sp-5)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}
    >
      {/* Title + status badge */}
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
        <span className={`badge ${config.badgeClass}`} style={{ flexShrink: 0 }}>
          {config.label}
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
        flexWrap: 'wrap',
        gap: 'var(--sp-2)',
      }}>
        <div style={{ display: 'flex', gap: 'var(--sp-4)' }}>
          <span style={{ fontSize: '0.75rem', color: 'hsl(var(--color-text-3))' }}>
            Due: {formatDate(assignment.due_date)}
          </span>
          {statusKey === 'graded' && grade !== null && (
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'hsl(var(--color-success))',
            }}>
              Score: {grade}/100
            </span>
          )}
        </div>
        <button
          onClick={() => navigate(`/student/classroom/${classId}/assignment/${assignment.id}`)}
          className="btn btn-primary btn-sm"
          aria-label={`${statusKey === 'pending' ? 'Start' : 'View'} ${assignment.title}`}
        >
          {statusKey === 'pending' ? 'Start' : 'View work'}
        </button>
      </div>
    </article>
  )
}

export default AssignmentCard
