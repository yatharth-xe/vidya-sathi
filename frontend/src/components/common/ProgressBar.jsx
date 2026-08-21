/**
 * ProgressBar — labelled progress indicator.
 *
 * Props:
 *   value   {number}  0–100
 *   label   {string}  — topic / section name
 *   showPct {boolean} — whether to show the % text (default true)
 *   variant {string}  — 'default' | 'success' | 'warning' | 'danger'
 */
import React from 'react'

const variantClass = {
  default: '',
  success: ' progress-fill-success',
  warning: ' progress-fill-warning',
  danger:  ' progress-fill-danger',
}

const ProgressBar = ({ value = 0, label, showPct = true, variant = 'default' }) => {
  const pct = Math.min(100, Math.max(0, value))

  // Auto-pick variant based on value if not specified
  const resolvedVariant = variant !== 'default' ? variant
    : pct >= 70 ? 'success'
    : pct >= 40 ? 'warning'
    : 'danger'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' }}>
      {(label || showPct) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {label && (
            <span style={{ fontSize: '0.8125rem', color: 'hsl(var(--color-text-2))' }}>
              {label}
            </span>
          )}
          {showPct && (
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'hsl(var(--color-text-3))' }}>
              {pct}%
            </span>
          )}
        </div>
      )}
      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ? `${label}: ${pct}%` : `${pct}%`}
      >
        <div
          className={`progress-fill${variantClass[resolvedVariant]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default ProgressBar
