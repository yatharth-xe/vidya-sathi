/**
 * Student Assignment Page.
 *
 * Route: /student/assignment/:assignmentId or /student/classroom/:classId/assignment/:assignId
 * Uses: GET /api/v1/student/assignments/{assignment_id}
 *
 * Layout:
 *   Desktop: LEFT PDF Viewer | RIGHT Question Panel
 *   Mobile: PDF above | Questions below
 */
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppShell from '../../components/common/AppShell'
import Sidebar from '../../components/common/Sidebar'
import PageHeader from '../../components/common/PageHeader'
import PDFViewer from '../../components/student/PDFViewer'
import QuestionCard from '../../components/student/QuestionCard'
import DoubtChat from '../../components/student/DoubtChat'
import Loader from '../../components/common/Loader'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import studentService from '../../services/studentService'
import { formatDate } from '../../utils/helpers'

const Assignment = () => {
  const { classId, assignId, assignmentId } = useParams()
  const targetAssignmentId = parseInt(assignmentId || assignId)

  const navigate = useNavigate()
  const [classrooms, setClassrooms] = useState([])
  const [assignment, setAssignment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Contextual doubt chat state
  const [activeDoubtContext, setActiveDoubtContext] = useState(null)
  const [showDoubtChat, setShowDoubtChat] = useState(false)

  const fetchAssignmentData = async () => {
    if (!targetAssignmentId || isNaN(targetAssignmentId)) {
      setError('Invalid assignment ID.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const [assignmentData, enrolledList] = await Promise.all([
        studentService.getAssignment(targetAssignmentId),
        studentService.getClassrooms().catch(() => []),
      ])
      setAssignment(assignmentData)
      setClassrooms(enrolledList || [])
    } catch (err) {
      setError(err.message || 'Failed to load assignment details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAssignmentData()
  }, [targetAssignmentId])

  const handleAskDoubt = (context) => {
    setActiveDoubtContext(context)
    setShowDoubtChat(true)
  }

  const sidebar = <Sidebar classrooms={classrooms} />

  const validClassId = classId && classId !== 'undefined' ? classId : (assignment?.classroom_id || null)
  const backRoute = validClassId ? `/student/classroom/${validClassId}` : '/student'

  if (loading) {
    return (
      <AppShell sidebar={sidebar}>
        <Loader message="Loading assignment & PDF document…" />
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell sidebar={sidebar}>
        <ErrorState message={error} onRetry={fetchAssignmentData} />
        <div style={{ textAlign: 'center', marginTop: 'var(--sp-4)' }}>
          <button className="btn btn-ghost" onClick={() => navigate(backRoute)}>
            ← Back to Classroom
          </button>
        </div>
      </AppShell>
    )
  }

  if (!assignment) {
    return (
      <AppShell sidebar={sidebar}>
        <EmptyState
          icon="🔍"
          title="Assignment not found"
          description="This assignment may have been removed or you don't have access to it."
          action={
            <button className="btn btn-ghost" onClick={() => navigate(backRoute)}>
              ← Back to Classroom
            </button>
          }
        />
      </AppShell>
    )
  }

  const questions = assignment.questions || []

  return (
    <AppShell sidebar={sidebar}>
      <PageHeader
        breadcrumb={
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate(backRoute)}
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}
          >
            ← Back to Classroom
          </button>
        }
        title={assignment.title}
        description={
          assignment.due_date
            ? `Due date: ${formatDate(assignment.due_date)}${assignment.description ? ` • ${assignment.description}` : ''}`
            : assignment.description || undefined
        }
        action={
          <button
            className="btn btn-secondary"
            onClick={() => {
              setActiveDoubtContext(null)
              setShowDoubtChat((v) => !v)
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {showDoubtChat ? 'Hide Tutor' : 'Open AI Tutor'}
          </button>
        }
      />

      {/* Main Responsive Grid Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 'var(--sp-6)',
          alignItems: 'start',
        }}
      >
        {/* Left Column: PDF Viewer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600 }}>
            Study Material (PDF)
          </h2>
          <PDFViewer
            assignmentId={assignment.id}
            title={assignment.title}
            filePath={assignment.file_path}
            loadPdf={(id) => studentService.getAssignmentFileBlob(id)}
            onDownload={(id) => studentService.downloadAssignmentPDF(id)}
          />
        </div>

        {/* Right Column: Question Panel or Doubt Chat */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          {showDoubtChat ? (
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--sp-3)' }}>
                AI Doubt Assistant
              </h2>
              <DoubtChat
                assignmentId={assignment.id}
                context={activeDoubtContext}
                onClose={() => setShowDoubtChat(false)}
              />
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-3)' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600 }}>
                  Assignment Questions ({questions.length})
                </h2>
                <span className="text-caption text-muted">
                  Click "Ask Doubt" on any question
                </span>
              </div>

              {questions.length === 0 ? (
                <EmptyState
                  icon="📝"
                  title="No questions added yet"
                  description="Your teacher hasn't added structured questions to this assignment document yet."
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
                  {questions.map((q) => (
                    <QuestionCard
                      key={q.id || q.question_number}
                      question={q}
                      assignmentId={assignment.id}
                      onAskDoubt={handleAskDoubt}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}

export default Assignment
