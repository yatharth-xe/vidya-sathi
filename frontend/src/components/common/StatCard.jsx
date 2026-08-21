/**
 * StatCard — a compact metric display.
 *
 * Props:
 *   label    {string}
 *   value    {string|number}
 *   icon     {ReactNode}  — optional SVG icon
 *   trend    {string}     — optional trend text, e.g. "+2.4%"
 *   trendUp  {boolean}    — true = green, false = red, undefined = neutral
 *   accent   {string}     — 'primary' | 'amber' | 'success' | 'danger' | 'warning'
 */
import React from 'react'

const ACCENT_COLORS = {
  primary: 'var(--color-primary)',
  amber:   'var(--color-secondary)',
  success: 'var(--color-success)',
  danger:  'var(--color-danger)',
  warning: 'var(--color-warning)',
}

const StatCard = ({ label, value, icon, trend, trendUp, accent = 'primary' }) => {
  const accentColor = ACCENT_COLORS[accent] || ACCENT_COLORS.primary
  const trendColor = trendUp === undefined
    ? 'hsl(var(--color-text-3))'
    : trendUp
      ? 'hsl(var(--color-success))'
      : 'hsl(var(--color-danger))'

  return (
    <div className="stat-card">
      {/* Header row: icon + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
        {icon && (
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--r-md)',
            background: `hsl(${accentColor} / 0.15)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: `hsl(${accentColor})`,
            flexShrink: 0,
          }} aria-hidden="true">
            {icon}
          </div>
        )}
        <span className="stat-label">{label}</span>
      </div>

      {/* Value */}
      <div className="stat-value">{value ?? '—'}</div>

      {/* Trend */}
      {trend && (
        <div className="stat-trend" style={{ color: trendColor }}>
          {trendUp === true && '↑ '}
          {trendUp === false && '↓ '}
          {trend}
        </div>
      )}
    </div>
  )
}

export default StatCard
