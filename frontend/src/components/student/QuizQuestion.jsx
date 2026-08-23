import React from 'react'

const QuizQuestion = ({ question, selectedOption, onSelectOption, disabled }) => {
  const options = [
    { key: 'A', text: question.option_a },
    { key: 'B', text: question.option_b },
    { key: 'C', text: question.option_c },
    { key: 'D', text: question.option_d }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
      <p style={{ fontSize: '1rem', fontWeight: '500', lineHeight: '1.5' }}>
        {question.question_text}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {options.map((opt) => {
          const isSelected = selectedOption === opt.key
          return (
            <div
              key={opt.key}
              onClick={() => !disabled && onSelectOption(opt.key)}
              style={{
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: isSelected ? 'hsl(var(--accent-primary))' : 'hsl(var(--border-color))',
                background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'hsl(var(--bg-tertiary))',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}
            >
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                border: '2px solid',
                borderColor: isSelected ? 'hsl(var(--accent-primary))' : 'hsl(var(--text-muted))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: isSelected ? 'hsl(var(--accent-primary))' : 'hsl(var(--text-muted))'
              }}>
                {opt.key}
              </div>
              <span style={{ fontSize: '0.9rem', color: isSelected ? '#fff' : 'hsl(var(--text-secondary))' }}>
                {opt.text}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default QuizQuestion
