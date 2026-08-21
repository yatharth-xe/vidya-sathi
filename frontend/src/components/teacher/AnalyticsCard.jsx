/**
 * AnalyticsCard — real classroom performance metrics from backend.
 * Does NOT display any hardcoded / fake data.
 * Uses only values from the `analytics` prop.
 */
import React from 'react'
import { formatPercentage } from '../../utils/helpers'
import StatCard from '../common/StatCard'

const AnalyticsCard = ({ analytics }) => {
  if (!analytics) return null

  const submissionRatePct = analytics.submission_rate != null
    ? Math.round(analytics.submission_rate * 100)
    : null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--sp-4)' }}
      role="region" aria-label="Classroom performance overview">

      {/* Average score */}
      <StatCard
        label="Class average score"
        value={formatPercentage(analytics.average_score)}
        accent="primary"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        }
      />

      {/* Submission rate */}
      <StatCard
        label="Submission rate"
        value={submissionRatePct != null ? `${submissionRatePct}%` : '—'}
        accent={submissionRatePct >= 80 ? 'success' : submissionRatePct >= 50 ? 'warning' : 'danger'}
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        }
      />

      {/* Students needing attention */}
      <StatCard
        label="Need teacher support"
        value={analytics.risk_students_count ?? '—'}
        accent={analytics.risk_students_count > 0 ? 'danger' : 'success'}
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        }
      />
    </div>
  )
}

export default AnalyticsCard
