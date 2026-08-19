import React, { useState } from 'react'
import QuizQuestion from './QuizQuestion'

const Quiz = ({ quiz }) => {
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)

  const handleSelectOption = (questionId, option) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: option
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (Object.keys(answers).length < quiz.questions.length) {
      alert('Please answer all questions before submitting.')
      return
    }

    let calculatedScore = 0
    quiz.questions.forEach((q) => {
      // Mock grading: assume first option 'A' or use mock data
      const correctOption = q.correct_option || 'A'
      if (answers[q.id] === correctOption) {
        calculatedScore += 1
      }
    })

    setScore(calculatedScore)
    setSubmitted(true)
  }

  return (
    <div className="glass-panel" style={{ padding: '2rem' }}>
      <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '0.5rem' }}>
        Quiz: {quiz.title}
      </h3>

      {!submitted ? (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {quiz.questions.map((q, idx) => (
            <div key={q.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'hsl(var(--accent-secondary))', fontWeight: '600', textTransform: 'uppercase' }}>
                Question {idx + 1} of {quiz.questions.length}
              </span>
              <QuizQuestion
                question={q}
                selectedOption={answers[q.id]}
                onSelectOption={(opt) => handleSelectOption(q.id, opt)}
                disabled={false}
              />
            </div>
          ))}

          <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start', marginTop: '1rem' }}>
            Submit Quiz
          </button>
        </form>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
          <h4 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Quiz Completed!</h4>
          <p style={{ color: 'hsl(var(--text-secondary))', marginBottom: '1.5rem' }}>
            You scored <strong style={{ color: 'hsl(var(--text-primary))' }}>{score}</strong> out of <strong style={{ color: 'hsl(var(--text-primary))' }}>{quiz.questions.length}</strong> questions correctly.
          </p>
          <div style={{
            display: 'inline-block',
            padding: '1rem 2rem',
            borderRadius: '12px',
            background: 'rgba(34, 197, 94, 0.1)',
            color: 'hsl(142, 70%, 45%)',
            fontWeight: '600',
            fontSize: '1.2rem'
          }}>
            Percentage: {((score / quiz.questions.length) * 100).toFixed(1)}%
          </div>
        </div>
      )}
    </div>
  )
}

export default Quiz
