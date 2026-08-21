/**
 * ChatMessage — Renders user & AI Tutor chat bubbles.
 * Formats Student Agent responses with Level 1-4 visible status badges,
 * hints, citations/sources, teacher notification notice, and practice CTA.
 */
import React from 'react'

const LEVEL_CONFIG = {
  1: { label: 'Doubt Cleared', badgeClass: 'badge-success' },
  2: { label: 'Guided Help', badgeClass: 'badge-primary' },
  3: { label: 'Practice Recommended', badgeClass: 'badge-warning' },
  4: { label: 'Teacher Support Recommended', badgeClass: 'badge-amber' },
}

const ChatMessage = ({ message, onStartPractice }) => {
  const isAgent = message.is_agent

  const levelInfo = message.level ? LEVEL_CONFIG[message.level] || LEVEL_CONFIG[1] : null

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isAgent ? 'flex-start' : 'flex-end',
        margin: 'var(--sp-2) 0',
        width: '100%',
      }}
    >
      <div
        style={{
          maxWidth: '85%',
          padding: 'var(--sp-3) var(--sp-4)',
          borderRadius: 'var(--r-lg)',
          borderBottomLeftRadius: isAgent ? '0px' : 'var(--r-lg)',
          borderBottomRightRadius: isAgent ? 'var(--r-lg)' : '0px',
          background: isAgent ? 'hsl(var(--color-surface-2))' : 'hsl(var(--color-primary))',
          color: isAgent ? 'hsl(var(--color-text))' : 'white',
          border: isAgent ? '1px solid hsl(var(--color-border))' : 'none',
          fontSize: '0.875rem',
          lineHeight: 1.55,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--sp-2)',
        }}
      >
        {/* Header badges for Agent response */}
        {isAgent && (levelInfo || message.topic || message.subject) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
            {levelInfo && (
              <span className={`badge ${levelInfo.badgeClass}`} style={{ fontSize: '0.6875rem' }}>
                Status: {levelInfo.label}
              </span>
            )}
            {message.subject && (
              <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
                {message.subject}
              </span>
            )}
            {message.topic && (
              <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
                {message.topic}
              </span>
            )}
          </div>
        )}

        {/* Message body */}
        <div style={{ whiteSpace: 'pre-wrap' }}>{message.message}</div>

        {/* Progressive Hints Section */}
        {isAgent && message.hints && message.hints.length > 0 && (
          <div
            style={{
              marginTop: 'var(--sp-2)',
              padding: 'var(--sp-3)',
              borderRadius: 'var(--r-md)',
              background: 'hsl(var(--color-surface-3, var(--color-surface)))',
              border: '1px solid hsl(var(--color-border))',
            }}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'hsl(var(--color-primary-fg))', display: 'block', marginBottom: 'var(--sp-1)' }}>
              💡 Helpful Hints:
            </span>
            <ul style={{ margin: 0, paddingLeft: 'var(--sp-4)', fontSize: '0.8125rem', color: 'hsl(var(--color-text-2))' }}>
              {message.hints.map((hint, idx) => (
                <li key={idx} style={{ marginBottom: 2 }}>{hint}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Citations / Sources Section */}
        {isAgent && message.citations && message.citations.length > 0 && (
          <div
            style={{
              marginTop: 'var(--sp-2)',
              padding: 'var(--sp-2) var(--sp-3)',
              borderRadius: 'var(--r-md)',
              background: 'hsl(var(--color-surface))',
              border: '1px solid hsl(var(--color-border))',
              fontSize: '0.75rem',
            }}
          >
            <span style={{ fontWeight: 600, color: 'hsl(var(--color-text-3))' }}>Sources: </span>
            <span style={{ color: 'hsl(var(--color-text-2))' }}>{message.citations.join(' • ')}</span>
          </div>
        )}

        {/* Teacher Intimated Neutral Notice */}
        {isAgent && message.teacher_intimated && (
          <div
            className="alert alert-info"
            style={{
              marginTop: 'var(--sp-2)',
              padding: 'var(--sp-2) var(--sp-3)',
              fontSize: '0.75rem',
              borderRadius: 'var(--r-md)',
            }}
          >
            ℹ️ Your teacher has been notified that you may benefit from additional support.
          </div>
        )}

        {/* Level 3 Practice CTA */}
        {isAgent && message.requires_quiz && (
          <div style={{ marginTop: 'var(--sp-2)' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onStartPractice}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1)' }}
            >
              Start Practice
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Timestamp & Sender */}
      <span
        style={{
          fontSize: '0.6875rem',
          color: 'hsl(var(--color-text-3))',
          marginTop: 'var(--sp-1)',
          padding: '0 var(--sp-1)',
        }}
      >
        {isAgent ? 'AI Tutor' : 'You'} • {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  )
}

export default ChatMessage
