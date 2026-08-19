import React from 'react'
import { formatPercentage } from '../../utils/helpers'

const AnalyticsCard = ({ analytics }) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', fontWeight: '500' }}>Class Average Score</span>
        <h3 style={{ fontSize: '2rem', fontWeight: '700' }}>{formatPercentage(analytics.average_score)}</h3>
        <span style={{ fontSize: '0.75rem', color: 'hsl(142, 70%, 45%)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          ↑ 2.4% from last week
        </span>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', fontWeight: '500' }}>Homework Submission Rate</span>
        <h3 style={{ fontSize: '2rem', fontWeight: '700' }}>{formatPercentage(analytics.submission_rate * 100)}</h3>
        <span style={{ fontSize: '0.75rem', color: 'hsl(142, 70%, 45%)' }}>
          Target: 90.0%
        </span>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', fontWeight: '500' }}>Students At Risk</span>
        <h3 style={{ fontSize: '2rem', fontWeight: '700', color: analytics.risk_students_count > 0 ? 'hsl(350, 89%, 60%)' : 'inherit' }}>
          {analytics.risk_students_count}
        </h3>
        <span style={{ fontSize: '0.75rem', color: analytics.risk_students_count > 0 ? 'hsl(350, 89%, 60%)' : 'hsl(var(--text-muted))' }}>
          Requires immediate intervention
        </span>
      </div>
    </div>
  )
}

export default AnalyticsCard
