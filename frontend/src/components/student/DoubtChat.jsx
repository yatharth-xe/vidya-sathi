/**
 * DoubtChat — Connected Student Agent Doubt Chat Panel.
 *
 * Calls: POST /api/v1/agents/student/chat via agentService.sendStudentDoubt
 * Preserves question context and session conversation history.
 * On Level 3 "Start Practice", triggers POST /api/v1/student/quiz/start and navigates to /student/practice/:quizId.
 *
 * Props:
 *   context  {object}   — { assignmentId, questionId, questionText, subject, topic }
 *   onClose  {function} — optional close panel handler
 */
import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import agentService from '../../services/agentService'
import studentService from '../../services/studentService'
import ChatMessage from './ChatMessage'
import ErrorState from '../common/ErrorState'

const DoubtChat = ({ assignmentId, context, onClose }) => {
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [startingQuiz, setStartingQuiz] = useState(false)
  const [error, setError] = useState(null)
  const chatEndRef = useRef(null)

  // Initial welcome message with question context if provided
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeText = context
        ? `Hello! I am your AI Tutor. I see you have a doubt regarding Question ${context.questionId}${context.subject ? ` (${context.subject})` : ''}:\n\n"${context.questionText}"\n\nHow can I help you solve this?`
        : 'Hello! I am your AI Tutor. Ask any doubt regarding your assignments or study materials.'

      setMessages([
        {
          id: 'init-1',
          message: welcomeText,
          is_agent: true,
          timestamp: new Date().toISOString(),
        },
      ])
    }
  }, [context])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, startingQuiz, error])

  const handleSend = async (e) => {
    if (e) e.preventDefault()
    if (!input.trim() || loading || startingQuiz) return

    const userText = input.trim()
    const userMsg = {
      id: `user-${Date.now()}`,
      message: userText,
      is_agent: false,
      timestamp: new Date().toISOString(),
    }

    // Preserve conversation history
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setError(null)

    const targetAssignmentId = parseInt(assignmentId || context?.assignmentId, 10)
    const questionId = context?.questionId ? parseInt(context.questionId, 10) : undefined

    if (isNaN(targetAssignmentId)) {
      setError('Invalid assignment context. Please refresh the page and try again.')
      setLoading(false)
      return
    }

    try {
      // Call backend Student Agent endpoint (student_id comes from JWT)
      const data = await agentService.sendStudentDoubt({
        assignmentId: targetAssignmentId,
        questionId: isNaN(questionId) ? undefined : questionId,
        message: userText,
      })

      const agentMsg = {
        id: `agent-${Date.now()}`,
        message: data.response,
        is_agent: true,
        level: data.level,
        topic: data.topic || context?.topic,
        subject: data.subject || context?.subject,
        requires_quiz: data.requires_quiz,
        teacher_intimated: data.teacher_intimated,
        attention_priority: data.attention_priority,
        hints: data.hints,
        citations: data.citations,
        quiz_id: data.quiz_id,
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, agentMsg])
    } catch (err) {
      setError(err.message || 'Failed to receive response from AI Tutor. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleStartPractice = async (msg) => {
    setStartingQuiz(true)
    setError(null)
    try {
      const practiceAssignmentId = parseInt(assignmentId || context?.assignmentId, 10) || 1
      const questionId = context?.questionId
      const topic = msg.topic || context?.topic || 'General Practice'

      // POST /api/v1/student/quiz/start -> receive quiz_id + 5 questions
      const quizData = await studentService.startPracticeQuiz({
        assignmentId: practiceAssignmentId,
        questionId,
        topic,
      })

      // Navigate to /student/practice/:quizId
      navigate(`/student/practice/${quizData.quiz_id}`, {
        state: {
          quizData,
          assignmentId: practiceAssignmentId,
          questionId,
          topic,
        },
      })
    } catch (err) {
      setError(err.message || 'Failed to start practice quiz. Please try again.')
    } finally {
      setStartingQuiz(false)
    }
  }

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '520px',
        maxHeight: '650px',
        overflow: 'hidden',
        border: '1px solid hsl(var(--color-border))',
        borderRadius: 'var(--r-lg)',
        background: 'hsl(var(--color-surface))',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: 'var(--sp-3) var(--sp-4)',
          borderBottom: '1px solid hsl(var(--color-border))',
          background: 'hsl(var(--color-surface-2))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--sp-2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', minWidth: 0 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'hsl(var(--color-success))',
              flexShrink: 0,
            }}
            aria-hidden="true"
          />
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'hsl(var(--color-text))' }}>
            AI Tutor (Student Agent)
          </span>
        </div>

        {onClose && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Close chat panel"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
          >
            ✕ Close
          </button>
        )}
      </div>

      {/* Question Context Banner */}
      {context && (
        <div
          style={{
            padding: 'var(--sp-3) var(--sp-4)',
            background: 'hsl(var(--color-primary-dim))',
            borderBottom: '1px solid hsl(var(--color-border))',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--sp-1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--color-primary-fg))' }}>
              Question {context.questionId}
            </span>
            {context.subject && (
              <span className="badge badge-primary" style={{ fontSize: '0.6875rem' }}>
                {context.subject}
              </span>
            )}
            {context.topic && (
              <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
                {context.topic}
              </span>
            )}
          </div>
          <p
            style={{
              fontSize: '0.8125rem',
              color: 'hsl(var(--color-text-2))',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            "{context.questionText}"
          </p>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div
        style={{
          flex: 1,
          padding: 'var(--sp-4)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--sp-2)',
        }}
      >
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            onStartPractice={() => handleStartPractice(msg)}
          />
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', padding: 'var(--sp-3)', alignSelf: 'flex-start' }}>
            <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} aria-hidden="true" />
            <span style={{ fontSize: '0.8125rem', color: 'hsl(var(--color-text-3))' }}>AI Tutor is thinking…</span>
          </div>
        )}

        {startingQuiz && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', padding: 'var(--sp-3)', alignSelf: 'flex-start' }}>
            <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} aria-hidden="true" />
            <span style={{ fontSize: '0.8125rem', color: 'hsl(var(--color-text-3))' }}>Starting Level 3 Practice Quiz…</span>
          </div>
        )}

        {error && (
          <ErrorState message={error} onRetry={() => setError(null)} />
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSend}
        style={{
          padding: 'var(--sp-3)',
          borderTop: '1px solid hsl(var(--color-border))',
          display: 'flex',
          gap: 'var(--sp-2)',
          background: 'hsl(var(--color-surface))',
        }}
      >
        <input
          type="text"
          className="input-field"
          placeholder={context ? `Ask about Question ${context.questionId}…` : 'Ask your doubt…'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading || startingQuiz}
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn-primary" disabled={loading || startingQuiz || !input.trim()}>
          {loading ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  )
}

export default DoubtChat
