/**
 * QuestionCard — Displays an assignment question with subject, topic, and Ask Doubt action.
 *
 * Props:
 *   question     {object}   — { id, question_number, question_text, subject, topic }
 *   assignmentId {number}   — current assignment ID
 *   onAskDoubt   {function} — callback triggered with question context
 */
import React from 'react'

const QuestionCard = ({ question, assignmentId, onAskDoubt }) => {
  const { id, question_number, question_text, subject, topic } = question

  const handleAskDoubt = () => {
    if (onAskDoubt) {
      onAskDoubt({
        assignmentId,
        questionId: id,
        questionText: question_text,
        subject: subject || null,
        topic: topic || null,
      })
    }
  }

  return (
    <article
      className="card card-padding"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--sp-3)',
        borderRadius: 'var(--r-lg)',
        border: '1px solid hsl(var(--color-border))',
        background: 'hsl(var(--color-surface))',
      }}
    >
      {/* Header row: Q number & metadata badges */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
        <span
          style={{
            fontSize: '0.8125rem',
            fontWeight: 700,
            color: 'hsl(var(--color-primary))',
            fontFamily: 'var(--font-display)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          Question {question_number}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
          {subject && (
            <span className="badge badge-primary">
              {subject}
            </span>
          )}
          {topic && (
            <span className="badge badge-neutral">
              {topic}
            </span>
          )}
        </div>
      </div>

      {/* Question Text */}
      <p style={{
        fontSize: '0.9375rem',
        color: 'hsl(var(--color-text))',
        lineHeight: 1.6,
        margin: 0,
        fontWeight: 500,
      }}>
        {question_text}
      </p>

      {/* Action Footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        paddingTop: 'var(--sp-2)',
        borderTop: '1px solid hsl(var(--color-border))',
        marginTop: 'var(--sp-1)',
      }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleAskDoubt}
          aria-label={`Ask doubt on Question ${question_number}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Ask Doubt
        </button>
      </div>
    </article>
  )
}

export default QuestionCard
