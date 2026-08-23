/**
 * PageHeader — consistent page title + description + optional action.
 *
 * Props:
 *   title       {string}       — page title (h1)
 *   description {string}       — subtitle text
 *   action      {ReactNode}    — optional button/element on the right
 *   breadcrumb  {string}       — optional small text above title
 */
import React from 'react'

const PageHeader = ({ title, description, action, breadcrumb }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 'var(--sp-4)',
      marginBottom: 'var(--sp-6)',
      flexWrap: 'wrap',
    }}
  >
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' }}>
      {breadcrumb && (
        <span className="text-caption text-muted">{breadcrumb}</span>
      )}
      <h1 style={{ fontSize: '1.625rem', fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
        {title}
      </h1>
      {description && (
        <p style={{ fontSize: '0.875rem', color: 'hsl(var(--color-text-2))', marginTop: 2, maxWidth: 560 }}>
          {description}
        </p>
      )}
    </div>
    {action && (
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
        {action}
      </div>
    )}
  </div>
)

export default PageHeader
