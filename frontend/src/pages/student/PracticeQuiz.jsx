/**
 * PracticeQuiz — Level 3 Educational Practice Quiz Page.
 *
 * Route: /student/practice/:quizId
 * Evaluated strictly by backend endpoint (POST /api/v1/student/quiz/submit).
 * React does NOT generate questions, evaluate options, or determine learning levels.
 */
import React, { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import AppShell from '../../components/common/AppShell'
import Sidebar from '../../components/common/Sidebar'
import PageHeader from '../../components/common/PageHeader'
import ProgressBar from '../../components/common/ProgressBar'
import Loader from '../../components/common/Loader'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import studentService from '../../services/studentService'

const LEVEL_BADGES = {
  1: { label: 'Doubt Cleared', badgeClass: 'badge-success' },
  2: { label: 'Guided Help', badgeClass: 'badge-primary' },
  3: { label: 'Practice Recommended', badgeClass: 'badge-warning' },
  4: { label: 'Teacher Support Recommended', badgeClass: 'badge-amber' },
}

const PracticeQuiz = () => {
  const { quizId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const [classrooms, setClassrooms] = useState([])
  const [quizData, setQuizData] = useState(location.state?.quizData || null)
  const [loading, setLoading] = useState(!location.state?.quizData)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // Quiz progress state
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState({}) // { question_id: 'A'|'B'|'C'|'D' }
  const [result, setResult] = useState(null) // Backend evaluation response

  // Initial load: fetch classrooms for sidebar + quiz questions if not passed in location state
  useEffect(() => {
    const initData = async () => {
      try {
        const enrolled = await studentService.getClassrooms().catch(() => [])
        setClassrooms(enrolled || [])

        if (!quizData) {
          const assignmentId = location.state?.assignmentId || 1
          const questionId = location.state?.questionId
          const topic = location.state?.topic || 'General Practice'

          const data = await studentService.startPracticeQuiz({
            assignmentId,
            questionId,
            topic,
          })
          setQuizData(data)
        }
      } catch (err) {
        setError(err.message || 'Failed to initialize practice quiz.')
      } finally {
        setLoading(false)
      }
    }
    initData()
  }, [quizId])

  const sidebar = <Sidebar classrooms={classrooms} />

  if (loading) {
    return (
      <AppShell sidebar={sidebar}>
        <Loader message="Preparing your topic practice quiz…" />
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell sidebar={sidebar}>
        <ErrorState message={error} onRetry={() => window.location.reload()} />
        <div style={{ textAlign: 'center', marginTop: 'var(--sp-4)' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/student')}>
            ← Return to Dashboard
          </button>
        </div>
      </AppShell>
    )
  }

  if (!quizData || !quizData.questions || quizData.questions.length === 0) {
    return (
      <AppShell sidebar={sidebar}>
        <EmptyState
          icon="📝"
          title="Practice Quiz Unavailable"
          description="Could not load practice questions for this topic."
          action={
            <button className="btn btn-primary" onClick={() => navigate('/student')}>
              Return to Dashboard
            </button>
          }
        />
      </AppShell>
    )
  }

  const questions = quizData.questions
  const currentQuestion = questions[currentIndex]
  const totalQuestions = questions.length
  const progressPercent = Math.round(((currentIndex + 1) / totalQuestions) * 100)

  const handleSelectOption = (questionId, optionKey) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionKey,
    }))
  }

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }

  const handleSubmitQuiz = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const answersPayload = questions.map((q) => ({
        question_id: q.id,
        selected_option: selectedAnswers[q.id] || 'A',
      }))

      const evaluation = await studentService.submitPracticeQuiz({
        quizId: quizData.quiz_id || quizId,
        assignmentId: quizData.assignment_id,
        questionId: quizData.question_id,
        topic: quizData.topic,
        answers: answersPayload,
      })

      setResult(evaluation)
    } catch (err) {
      setError(err.message || 'Failed to submit quiz for evaluation.')
    } finally {
      setSubmitting(false)
    }
  }

  // Encouraging micro-copy per step
  const getMicroCopy = () => {
    if (currentIndex === 0) return "Let's strengthen this topic!"
    if (currentIndex < totalQuestions - 1) return 'Good progress! Keep going.'
    return "Final question! You're doing great."
  }

  return (
    <AppShell sidebar={sidebar}>
      <PageHeader
        breadcrumb={
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/student')}
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}
          >
            ← Return to Dashboard
          </button>
        }
        title={`Practice Quiz: ${quizData.topic || 'Topic Review'}`}
        description="Complete this 5-question module to strengthen your understanding."
      />

      <div style={{ maxWidth: 680, margin: '0 auto', width: '100%' }}>
        {/* ================= RESULT SCREEN ================= */}
        {result ? (
          <div
            className="card card-padding"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--sp-5)',
              textAlign: 'center',
              borderRadius: 'var(--r-lg)',
            }}
          >
            <div style={{ fontSize: '3rem', lineHeight: 1 }} aria-hidden="true">
              {result.percentage >= 80 ? '🎉' : result.percentage >= 60 ? '👍' : '💬'}
            </div>

            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: 'var(--sp-1)' }}>
                Practice Module Complete
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'hsl(var(--color-text-2))' }}>
                Topic: <strong>{result.topic || quizData.topic}</strong>
              </p>
            </div>

            {/* Score & Level Display (derived strictly from backend) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--sp-6)',
                padding: 'var(--sp-4)',
                borderRadius: 'var(--r-md)',
                background: 'hsl(var(--color-surface-2))',
                border: '1px solid hsl(var(--color-border))',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <span className="text-caption text-muted" style={{ display: 'block' }}>Score</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'hsl(var(--color-text))' }}>
                  {result.score} / {result.total_questions}
                </span>
                <span style={{ fontSize: '0.8125rem', color: 'hsl(var(--color-text-2))', display: 'block' }}>
                  ({result.percentage}%)
                </span>
              </div>

              <div style={{ borderLeft: '1px solid hsl(var(--color-border))', paddingLeft: 'var(--sp-6)' }}>
                <span className="text-caption text-muted" style={{ display: 'block', marginBottom: 'var(--sp-1)' }}>Updated Status</span>
                <span className={`badge ${(LEVEL_BADGES[result.level] || LEVEL_BADGES[1]).badgeClass}`}>
                  {(LEVEL_BADGES[result.level] || LEVEL_BADGES[1]).label}
                </span>
              </div>
            </div>

            {/* Backend Recommendation */}
            <div
              style={{
                padding: 'var(--sp-4)',
                borderRadius: 'var(--r-md)',
                background: 'hsl(var(--color-surface))',
                border: '1px solid hsl(var(--color-border))',
                textAlign: 'left',
              }}
            >
              <span className="text-caption text-muted" style={{ fontWeight: 600, display: 'block', marginBottom: 'var(--sp-1)' }}>
                Learning Recommendation
              </span>
              <p style={{ fontSize: '0.875rem', color: 'hsl(var(--color-text-2))', margin: 0, lineHeight: 1.5 }}>
                {result.recommendation}
              </p>
            </div>

            {/* Neutral Teacher Intimation Banner */}
            {result.teacher_intimated && (
              <div className="alert alert-info" style={{ textAlign: 'left', fontSize: '0.8125rem' }}>
                ℹ️ Your teacher has been notified that you may benefit from additional support.
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 'var(--sp-3)', justifyContent: 'center', marginTop: 'var(--sp-2)' }}>
              <button
                className="btn btn-primary"
                onClick={() => navigate(quizData.assignment_id ? `/student/assignment/${quizData.assignment_id}` : '/student')}
              >
                Return to Study Material
              </button>
            </div>
          </div>
        ) : (
          /* ================= QUIZ QUESTION STEPS ================= */
          <div
            className="card card-padding"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--sp-5)',
              borderRadius: 'var(--r-lg)',
            }}
          >
            {/* Header: Progress & Micro-copy */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'hsl(var(--color-primary))', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Question {currentIndex + 1} of {totalQuestions}
                </span>
                <span style={{ fontSize: '0.8125rem', color: 'hsl(var(--color-text-3))' }}>
                  {getMicroCopy()}
                </span>
              </div>
              <ProgressBar value={progressPercent} max={100} label={`Question ${currentIndex + 1} of ${totalQuestions}`} />
            </div>

            {/* Question Text */}
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'hsl(var(--color-text))', lineHeight: 1.5, marginBottom: 0 }}>
                {currentQuestion.question_text}
              </h3>
            </div>

            {/* Options List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }} role="radiogroup" aria-label={`Options for Question ${currentIndex + 1}`}>
              {[
                { key: 'A', text: currentQuestion.option_a },
                { key: 'B', text: currentQuestion.option_b },
                { key: 'C', text: currentQuestion.option_c },
                { key: 'D', text: currentQuestion.option_d },
              ].map((opt) => {
                const isSelected = selectedAnswers[currentQuestion.id] === opt.key
                return (
                  <button
                    key={opt.key}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleSelectOption(currentQuestion.id, opt.key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--sp-3)',
                      padding: 'var(--sp-3) var(--sp-4)',
                      borderRadius: 'var(--r-md)',
                      border: `1.5px solid ${isSelected ? 'hsl(var(--color-primary))' : 'hsl(var(--color-border))'}`,
                      background: isSelected ? 'hsl(var(--color-primary-dim))' : 'hsl(var(--color-surface))',
                      color: 'hsl(var(--color-text))',
                      fontSize: '0.875rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        border: `1.5px solid ${isSelected ? 'hsl(var(--color-primary))' : 'hsl(var(--color-text-3))'}`,
                        background: isSelected ? 'hsl(var(--color-primary))' : 'transparent',
                        color: isSelected ? 'white' : 'hsl(var(--color-text-2))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {opt.key}
                    </span>
                    <span style={{ flex: 1 }}>{opt.text}</span>
                  </button>
                )
              })}
            </div>

            {/* Error Message */}
            {error && (
              <ErrorState message={error} onRetry={() => setError(null)} />
            )}

            {/* Navigation Footer */}
            <div
              style={{
                display: 'flex',
                justify: 'space-between',
                alignItems: 'center',
                paddingTop: 'var(--sp-4)',
                borderTop: '1px solid hsl(var(--color-border))',
                marginTop: 'var(--sp-2)',
              }}
            >
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handlePrev}
                disabled={currentIndex === 0 || submitting}
              >
                ← Previous
              </button>

              {currentIndex < totalQuestions - 1 ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleNext}
                  disabled={!selectedAnswers[currentQuestion.id]}
                >
                  Next Question →
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSubmitQuiz}
                  disabled={submitting || Object.keys(selectedAnswers).length < totalQuestions}
                >
                  {submitting ? (
                    <>
                      <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} aria-hidden="true" />
                      Evaluating Answers…
                    </>
                  ) : (
                    'Submit Practice Quiz'
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}

export default PracticeQuiz
