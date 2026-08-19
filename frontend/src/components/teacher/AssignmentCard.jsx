import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { formatDate } from '../../utils/helpers'

const AssignmentCard = ({ assignment }) => {
  const { classId } = useParams()
  const navigate = useNavigate()

  const submissionsCount = assignment.submissions?.length || 0

  return (
    <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h4 style={{ fontSize: '1.1rem' }}>{assignment.title}</h4>
        <span style={{
          fontSize: '0.75rem',
          padding: '0.2rem 0.5rem',
          borderRadius: '4px',
          background: 'rgba(59, 130, 246, 0.1)',
          color: 'hsl(190, 95%, 45%)',
          fontWeight: '600'
        }}>
          {submissionsCount} {submissionsCount === 1 ? 'Submission' : 'Submissions'}
        </span>
      </div>

      <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>
        {assignment.description || 'No description provided.'}
      </p>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '0.5rem',
        borderTop: '1px solid hsl(var(--border-color))',
        paddingTop: '0.75rem',
        fontSize: '0.8rem'
      }}>
        <span style={{ color: 'hsl(var(--text-muted))' }}>
          Due: {formatDate(assignment.due_date)}
        </span>
        <button
          onClick={() => navigate(`/teacher/classroom/${classId}/assignment/${assignment.id}`)}
          className="btn-primary"
          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
        >
          Manage & Grade
        </button>
      </div>
    </div>
  )
}

export default AssignmentCard
