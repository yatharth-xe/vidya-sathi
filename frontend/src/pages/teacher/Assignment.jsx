/**
 * Teacher Assignment Page — view assignment details, manage structured questions, upload/replace PDF file.
 *
 * Consumes:
 *   GET  /api/v1/assignments/{assignment_id}
 *   GET  /api/v1/assignments/{assignment_id}/questions
 *   POST /api/v1/assignments/{assignment_id}/upload-pdf
 *   POST /api/v1/assignments/{assignment_id}/questions
 */
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppShell from '../../components/common/AppShell'
import Sidebar from '../../components/common/Sidebar'
import PageHeader from '../../components/common/PageHeader'
import PDFViewer from '../../components/student/PDFViewer'
import Loader from '../../components/common/Loader'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import teacherService from '../../services/teacherService'

const TeacherAssignment = () => {
  const { classId, assignId, assignmentId } = useParams()
  const targetAssignmentId = parseInt(assignmentId || assignId)
  const navigate = useNavigate()

  const [classrooms, setClassrooms] = useState([])
  const [assignment, setAssignment] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // PDF Upload state
  const [pdfFile, setPdfFile] = useState(null)
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [pdfMessage, setPdfMessage] = useState(null)
  const [showPdfForm, setShowPdfForm] = useState(false)

  // Add Question Form State
  const [qNumber, setQNumber] = useState(1)
  const [qText, setQText] = useState('')
  const [qSubject, setQSubject] = useState('')
  const [qTopic, setQTopic] = useState('')
  const [addingQuestion, setAddingQuestion] = useState(false)
  const [questionMessage, setQuestionMessage] = useState(null)
  const [showQuestionForm, setShowQuestionForm] = useState(false)

  const fetchAssignmentData = async () => {
    if (!targetAssignmentId || isNaN(targetAssignmentId)) {
      setError('Invalid assignment ID.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const [assignData, questionsData, ownClassrooms] = await Promise.all([
        teacherService.getAssignment(targetAssignmentId),
        teacherService.getQuestions(targetAssignmentId).catch(() => []),
        teacherService.getClassrooms().catch(() => []),
      ])
      setAssignment(assignData)
      setQuestions(questionsData || assignData.questions || [])
      setClassrooms(ownClassrooms || [])
      setQNumber((questionsData?.length || assignData.questions?.length || 0) + 1)
    } catch (err) {
      setError(err.message || 'Failed to load assignment details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAssignmentData()
  }, [targetAssignmentId])

  const handleUploadPDF = async (e) => {
    e.preventDefault()
    if (!pdfFile) return
    setUploadingPdf(true)
    setPdfMessage(null)
    try {
      await teacherService.uploadAssignmentPDF(targetAssignmentId, pdfFile)
      setPdfMessage({ type: 'success', text: 'PDF document uploaded successfully!' })
      setPdfFile(null)
      setShowPdfForm(false)
      fetchAssignmentData()
    } catch (err) {
      setPdfMessage({ type: 'danger', text: err.message || 'Failed to upload PDF. Please check file type (PDF only, max 20MB).' })
    } finally {
      setUploadingPdf(false)
    }
  }

  const handleAddQuestion = async (e) => {
    e.preventDefault()
    if (!qText.trim()) return
    setAddingQuestion(true)
    setQuestionMessage(null)
    try {
      await teacherService.createQuestion(targetAssignmentId, {
        questionNumber: parseInt(qNumber),
        questionText: qText,
        subject: qSubject || undefined,
        topic: qTopic || undefined,
      })
      setQuestionMessage({ type: 'success', text: 'Question added successfully!' })
      setQText('')
      setQSubject('')
      setQTopic('')
      setShowQuestionForm(false)
      fetchAssignmentData()
    } catch (err) {
      setQuestionMessage({ type: 'danger', text: err.message || 'Failed to add question.' })
    } finally {
      setAddingQuestion(false)
    }
  }

  const sidebar = <Sidebar classrooms={classrooms} />
  const backRoute = classId ? `/teacher/classroom/${classId}` : '/teacher'

  if (loading) {
    return (
      <AppShell sidebar={sidebar}>
        <Loader message="Loading assignment & resources…" />
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
          description="This assignment may have been removed or you do not have permission to view it."
          action={
            <button className="btn btn-primary" onClick={() => navigate(backRoute)}>
              Return to Classroom
            </button>
          }
        />
      </AppShell>
    )
  }

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
        description={assignment.description || 'Assignment management, PDF document resources, and structured questions.'}
        action={
          <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
            <button
              className="btn btn-secondary"
              onClick={() => { setShowPdfForm((v) => !v); setPdfMessage(null) }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              {assignment.file_path ? 'Replace PDF' : 'Upload PDF'}
            </button>
            <button
              className="btn btn-primary"
              onClick={() => { setShowQuestionForm((v) => !v); setQuestionMessage(null) }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add question
            </button>
          </div>
        }
      />

      {/* PDF Upload / Replace Form */}
      {showPdfForm && (
        <div className="card card-padding" style={{ marginBottom: 'var(--sp-6)', maxWidth: 520 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--sp-2)' }}>
            {assignment.file_path ? 'Replace Assignment PDF' : 'Upload Assignment PDF'}
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'hsl(var(--color-text-2))', marginBottom: 'var(--sp-4)', lineHeight: 1.5 }}>
            Select a PDF document (max 20MB) to attach to this assignment.
          </p>

          {pdfMessage && (
            <div className={`alert alert-${pdfMessage.type}`} role="alert" style={{ marginBottom: 'var(--sp-4)' }}>
              {pdfMessage.text}
            </div>
          )}

          <form onSubmit={handleUploadPDF} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <div className="form-field">
              <label htmlFor="pdf-file-input" className="form-label">
                PDF File <span aria-hidden="true" style={{ color: 'hsl(var(--color-danger))' }}>*</span>
              </label>
              <input
                id="pdf-file-input"
                type="file"
                accept="application/pdf"
                className="input-field"
                onChange={(e) => setPdfFile(e.target.files[0] || null)}
                required
                disabled={uploadingPdf}
              />
            </div>

            <div style={{ display: 'flex', gap: 'var(--sp-3)', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => { setShowPdfForm(false); setPdfMessage(null) }}
                disabled={uploadingPdf}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={uploadingPdf || !pdfFile}>
                {uploadingPdf ? (
                  <>
                    <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} aria-hidden="true" />
                    Uploading…
                  </>
                ) : (
                  'Upload PDF'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Question Form */}
      {showQuestionForm && (
        <div className="card card-padding" style={{ marginBottom: 'var(--sp-6)', maxWidth: 540 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--sp-2)' }}>
            Add Structured Question
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'hsl(var(--color-text-2))', marginBottom: 'var(--sp-4)', lineHeight: 1.5 }}>
            Add a question for student practice and AI Tutor contextual doubt solving.
          </p>

          {questionMessage && (
            <div className={`alert alert-${questionMessage.type}`} role="alert" style={{ marginBottom: 'var(--sp-4)' }}>
              {questionMessage.text}
            </div>
          )}

          <form onSubmit={handleAddQuestion} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
              <div className="form-field" style={{ width: 100 }}>
                <label htmlFor="q-num" className="form-label">Q. No.</label>
                <input
                  id="q-num"
                  type="number"
                  className="input-field"
                  value={qNumber}
                  onChange={(e) => setQNumber(e.target.value)}
                  min="1"
                  required
                  disabled={addingQuestion}
                />
              </div>

              <div className="form-field" style={{ flex: 1 }}>
                <label htmlFor="q-subject" className="form-label">Subject</label>
                <input
                  id="q-subject"
                  type="text"
                  className="input-field"
                  placeholder="e.g. Mathematics"
                  value={qSubject}
                  onChange={(e) => setQSubject(e.target.value)}
                  disabled={addingQuestion}
                />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="q-topic" className="form-label">Topic</label>
              <input
                id="q-topic"
                type="text"
                className="input-field"
                placeholder="e.g. Quadratic Equations"
                value={qTopic}
                onChange={(e) => setQTopic(e.target.value)}
                disabled={addingQuestion}
              />
            </div>

            <div className="form-field">
              <label htmlFor="q-text" className="form-label">
                Question Text <span aria-hidden="true" style={{ color: 'hsl(var(--color-danger))' }}>*</span>
              </label>
              <textarea
                id="q-text"
                className="input-field"
                placeholder="Enter the full question text…"
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                required
                disabled={addingQuestion}
                rows={3}
              />
            </div>

            <div style={{ display: 'flex', gap: 'var(--sp-3)', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => { setShowQuestionForm(false); setQuestionMessage(null) }}
                disabled={addingQuestion}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={addingQuestion || !qText.trim()}>
                {addingQuestion ? (
                  <>
                    <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} aria-hidden="true" />
                    Adding…
                  </>
                ) : (
                  'Add Question'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid Layout: PDF Document View + Questions List */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 'var(--sp-6)',
          alignItems: 'start',
        }}
      >
        {/* Left: PDF Document Viewer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600 }}>
            Assignment PDF Resource
          </h2>
          <PDFViewer
            assignmentId={assignment.id}
            title={assignment.title}
            filePath={assignment.file_path}
          />
        </div>

        {/* Right: Structured Questions List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600 }}>
              Structured Questions ({questions.length})
            </h2>
            <span className="text-caption text-muted">
              Used by AI Tutor
            </span>
          </div>

          {questions.length === 0 ? (
            <EmptyState
              icon="📝"
              title="No questions added yet"
              description="Click 'Add question' above to create structured questions for student practice."
              action={
                <button className="btn btn-primary" onClick={() => setShowQuestionForm(true)}>
                  Add first question
                </button>
              }
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              {questions.map((q) => (
                <div
                  key={q.id || q.question_number}
                  className="card card-padding"
                  style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'hsl(var(--color-primary))' }}>
                      Question {q.question_number}
                    </span>
                    <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                      {q.subject && <span className="badge badge-primary">{q.subject}</span>}
                      {q.topic && <span className="badge badge-neutral">{q.topic}</span>}
                    </div>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'hsl(var(--color-text))', margin: 0, lineHeight: 1.5 }}>
                    {q.question_text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}

export default TeacherAssignment
