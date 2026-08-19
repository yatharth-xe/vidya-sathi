import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { formatDate } from '../../utils/helpers'

const AssignmentCard = ({ assignment }) => {
  const { classId } = useParams()
  const navigate = useNavigate()

  const submission = assignment.submissions?.[0]
  const status = submission ? submission.status : 'pending'
  const grade = submission ? submission.grade : null

  const getStatusStyle = () => {
    switch (status) {
      case 'graded':
        return { background: 'rgba(34, 197, 94, 0.1)', color: 'hsl(142, 70%, 45%)' }
      case 'submitted':
        return { background: 'rgba(59, 130, 246, 0.1)', color: 'hsl(190, 95%, 45%)' }
      default:
        return { background: 'rgba(245, 158, 11, 0.1)', color: 'hsl(38, 92%, 50%)' }
    }
  }

  return (
    <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h4 style={{ fontSize: '1.1rem' }}>{assignment.title}</h4>
        <span style={{
          fontSize: '0.75rem',
          padding: '0.2rem 0.5rem',
          borderRadius: '4px',
          textTransform: 'capitalize',
          fontWeight: '600',
          ...getStatusStyle()
        }}>
          {status}
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
        {status === 'graded' && grade !== null && (
          <span style={{ fontWeight: '600', color: 'hsl(142, 70%, 45%)' }}>
            Grade: {grade}/100
          </span>
        )}
        <button
          onClick={() => navigate(`/student/classroom/${classId}/assignment/${assignment.id}`)}
          className="btn-primary"
          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
        >
          {status === 'pending' ? 'Start Assignment' : 'View Work'}
        </button>
      </div>
    </div>
  )
}

export default AssignmentCard
