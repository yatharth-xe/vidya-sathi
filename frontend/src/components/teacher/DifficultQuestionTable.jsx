import React from 'react'

const DifficultQuestionTable = () => {
  // Mock data of difficult questions
  const mockQuestions = [
    { id: 1, question: "If alpha and beta are roots of x^2 - 5x + 6 = 0, find alpha^2 + beta^2.", errorRate: "72%", quiz: "Quadratic Quiz 1" },
    { id: 2, question: "Calculate the integral of sin^2(x) dx from 0 to pi/2.", errorRate: "65%", quiz: "Calculus Homework" }
  ]

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', overflow: 'hidden' }}>
      <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Struggling Quiz Questions</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid hsl(var(--border-color))' }}>
            <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase' }}>Question Snippet</th>
            <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase' }}>Quiz / Test</th>
            <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', textAlign: 'right' }}>Error Rate</th>
          </tr>
        </thead>
        <tbody>
          {mockQuestions.map((q) => (
            <tr key={q.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
              <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.9rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {q.question}
              </td>
              <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>{q.quiz}</td>
              <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.9rem', textAlign: 'right', color: 'hsl(350, 89%, 60%)', fontWeight: '600' }}>
                {q.errorRate}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default DifficultQuestionTable
