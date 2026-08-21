/**
 * EmptyState — guidance when a list or section has no content.
 *
 * Props:
 *   icon        {string}    — emoji or single glyph
 *   title       {string}
 *   description {string}
 *   action      {ReactNode} — optional CTA button
 */
import React from 'react'

const EmptyState = ({ icon = '📭', title, description, action }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      padding: 'var(--sp-16) var(--sp-6)',
      gap: 'var(--sp-3)',
    }}
    role="status"
    aria-label={title}
  >
    <span style={{ fontSize: '2.5rem', lineHeight: 1 }} aria-hidden="true">
      {icon}
    </span>
    <h3 style={{
      fontSize: '1rem',
      fontWeight: 600,
      color: 'hsl(var(--color-text))',
      fontFamily: 'var(--font-display)',
    }}>
      {title}
    </h3>
    {description && (
      <p style={{
        fontSize: '0.875rem',
        color: 'hsl(var(--color-text-2))',
        maxWidth: 360,
        lineHeight: 1.6,
      }}>
        {description}
      </p>
    )}
    {action && (
      <div style={{ marginTop: 'var(--sp-2)' }}>
        {action}
      </div>
    )}
  </div>
)

export default EmptyState
