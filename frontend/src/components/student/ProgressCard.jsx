/**
 * ProgressCard — student learning progress panel.
 * Uses student-friendly language: no "at risk", no "weak".
 * Real data only — no fake values added.
 */
import React from 'react'
import { formatPercentage } from '../../utils/helpers'
import ProgressBar from '../common/ProgressBar'

const LEVEL_CONFIG = {
  low:    { label: 'Support available',   badgeClass: 'badge-danger' },
  medium: { label: 'Let\'s strengthen this', badgeClass: 'badge-warning' },
  high:   { label: 'On track',            badgeClass: 'badge-success' },
}

const ProgressCard = ({ progress }) => {
  const levelConfig = LEVEL_CONFIG[progress.risk_level] ?? LEVEL_CONFIG.high
  const completionPct = progress.assignments_total > 0
    ? Math.round((progress.assignments_completed / progress.assignments_total) * 100)
    : 0

  return (
    <section
      className="card card-padding"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}
      aria-label="Your learning progress"
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1rem',
          fontWeight: 600,
        }}>
          Your progress
        </h3>
        <span className={`badge ${levelConfig.badgeClass}`}>
          {levelConfig.label}
        </span>
      </div>

      {/* Score + completions */}
      <div className="grid-2" style={{ gap: 'var(--sp-3)' }}>
        <div style={{
          background: 'hsl(var(--color-surface-2))',
          padding: 'var(--sp-4)',
          borderRadius: 'var(--r-md)',
          border: '1px solid hsl(var(--color-border))',
        }}>
          <div style={{ fontSize: '0.75rem', color: 'hsl(var(--color-text-3))', marginBottom: 'var(--sp-1)' }}>
            Overall score
          </div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.625rem',
            fontWeight: 700,
            color: 'hsl(var(--color-text))',
          }}>
            {formatPercentage(progress.overall_grade)}
          </div>
        </div>

        <div style={{
          background: 'hsl(var(--color-surface-2))',
          padding: 'var(--sp-4)',
          borderRadius: 'var(--r-md)',
          border: '1px solid hsl(var(--color-border))',
        }}>
          <div style={{ fontSize: '0.75rem', color: 'hsl(var(--color-text-3))', marginBottom: 'var(--sp-1)' }}>
            Submitted
          </div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.625rem',
            fontWeight: 700,
            color: 'hsl(var(--color-text))',
          }}>
            {progress.assignments_completed}
            <span style={{ fontSize: '1rem', color: 'hsl(var(--color-text-3))', fontWeight: 500 }}>
              /{progress.assignments_total}
            </span>
          </div>
        </div>
      </div>

      {/* Completion progress bar */}
      <ProgressBar
        value={completionPct}
        label="Assignment completion"
        variant={completionPct >= 80 ? 'success' : completionPct >= 50 ? 'warning' : 'danger'}
      />

      {/* Topic progress */}
      {progress.weak_topics?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          <h4 style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'hsl(var(--color-text-2))',
          }}>
            Topic progress
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            {progress.weak_topics.map((topic, i) => (
              <ProgressBar
                key={i}
                value={topic.understanding_score}
                label={topic.topic}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

export default ProgressCard
