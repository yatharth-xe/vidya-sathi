import React from 'react'
import { formatPercentage } from '../../utils/helpers'

const ProgressCard = ({ progress }) => {
  const getRiskStyle = () => {
    switch (progress.risk_level) {
      case 'high':
        return { background: 'rgba(239, 68, 68, 0.1)', color: 'hsl(350, 89%, 60%)' }
      case 'medium':
        return { background: 'rgba(245, 158, 11, 0.1)', color: 'hsl(38, 92%, 50%)' }
      default:
        return { background: 'rgba(34, 197, 94, 0.1)', color: 'hsl(142, 70%, 45%)' }
    }
  }

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.2rem' }}>Learning Analytics</h3>
        <span style={{
          fontSize: '0.75rem',
          fontWeight: '600',
          padding: '0.25rem 0.6rem',
          borderRadius: '20px',
          textTransform: 'uppercase',
          ...getRiskStyle()
        }}>
          Risk Status: {progress.risk_level}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid hsl(var(--border-color))' }}>
          <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>Overall Score</span>
          <h4 style={{ fontSize: '1.75rem', marginTop: '0.25rem' }}>{formatPercentage(progress.overall_grade)}</h4>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid hsl(var(--border-color))' }}>
          <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>Submissions</span>
          <h4 style={{ fontSize: '1.75rem', marginTop: '0.25rem' }}>
            {progress.assignments_completed}/{progress.assignments_total}
          </h4>
        </div>
      </div>

      <div>
        <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: 'hsl(var(--text-secondary))' }}>Concept Heatmap</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {progress.weak_topics?.map((topic, index) => (
            <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span>{topic.topic}</span>
                <span style={{ color: topic.understanding_score < 50 ? 'hsl(350, 89%, 60%)' : 'hsl(var(--text-muted))' }}>
                  {topic.understanding_score}%
                </span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${topic.understanding_score}%`,
                  background: topic.understanding_score < 50 ? 'hsl(350, 89%, 60%)' : 'linear-gradient(90deg, hsl(var(--accent-primary)) 0%, hsl(var(--accent-secondary)) 100%)',
                  borderRadius: '3px'
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ProgressCard
