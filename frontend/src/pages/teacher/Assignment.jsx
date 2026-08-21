import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppShell from '../../components/common/AppShell'
import Sidebar from '../../components/common/Sidebar'
import PageHeader from '../../components/common/PageHeader'
import PDFViewer from '../../components/student/PDFViewer'
import Loader from '../../components/common/Loader'
import EmptyState from '../../components/common/EmptyState'
import teacherService from '../../services/teacherService'

const TeacherAssignment = () => {
  const { classId, assignId } = useParams()
  const navigate = useNavigate()
  const [classrooms, setClassrooms] = useState([])
  const [assignment, setAssignment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submissions, setSubmissions] = useState([])
  const [gradingId, setGradingId] = useState(null)
  const [gradeInput, setGradeInput] = useState('')
  const [feedbackInput, setFeedbackInput] = useState('')
  const [submittingGrade, setSubmittingGrade] = useState(false)

  const fetchData = async () => {
    try {
      const list = await teacherService.getClassrooms()
      setClassrooms(list)
      
      const currentClass = list.find(c => c.id === parseInt(classId))
      const currentAssign = currentClass?.assignments?.find(a => a.id === parseInt(assignId))
      setAssignment(currentAssign)
      setSubmissions(currentAssign?.submissions || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [classId, assignId])

  const handleGradeSubmit = async (submissionId) => {
    setSubmittingGrade(true)
    try {
      // Update local submission state or call service
      setSubmissions(prev => prev.map(sub => {
        if (sub.id === submissionId) {
          return { ...sub, grade: parseFloat(gradeInput), feedback: feedbackInput, status: 'graded' }
        }
        return sub
      }))
      setGradingId(null)
      setGradeInput('')
      setFeedbackInput('')
    } catch (err) {
      console.error('Failed to update grade:', err)
    } finally {
      setSubmittingGrade(false)
    }
  }

  const sidebar = <Sidebar classrooms={classrooms} />

  if (loading) {
    return (
      <AppShell sidebar={sidebar}>
        <Loader message="Loading assignment…" />
      </AppShell>
    )
  }

  if (!assignment) {
    return (
      <AppShell sidebar={sidebar}>
        <EmptyState icon="🔍" title="Assignment not found"
          description="This assignment may have been removed."
          action={<button className="btn btn-ghost" onClick={() => navigate(`/teacher/classroom/${classId}`)}>← Back to classroom</button>}
        />
      </AppShell>
    )
  }

  return (
    <AppShell sidebar={sidebar}>
      <PageHeader
        breadcrumb={<button className="btn btn-ghost btn-sm" onClick={() => navigate(`/teacher/classroom/${classId}`)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}>← Back to classroom</button>}
        title={assignment.title}
        description={assignment.description || 'No specific instructions provided.'}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--sp-6)' }}>
            
            {/* PDF / Materials viewer */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600 }}>Assignment Document</h2>
              <PDFViewer title={assignment.title} fileUrl={assignment.file_path} />
            </div>

            {/* Student Submissions List & Grading */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600 }}>Student submissions ({submissions.length})</h2>
              
              {submissions.length === 0 ? (
                <EmptyState icon="📭" title="No submissions yet"
                  description="Students haven't submitted this assignment yet."
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                  {submissions.map((sub) => (
                    <div key={sub.id} className="card card-padding" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '0.9375rem', fontWeight: 600 }}>
                            {sub.student_name || `Student #${sub.student_id}`}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'hsl(var(--color-text-3))' }}>
                            Submitted: {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                        <span className={`badge ${sub.status === 'graded' ? 'badge-success' : 'badge-warning'}`}>
                          {sub.status}
                        </span>
                      </div>

                      {sub.grade != null && (
                        <div style={{ fontSize: '0.875rem', color: 'hsl(var(--color-text-2))' }}>
                          <strong>Grade:</strong> {sub.grade}/100
                        </div>
                      )}

                      {sub.feedback && (
                        <div style={{
                          padding: 'var(--sp-3)',
                          borderRadius: 'var(--r-md)',
                          background: 'hsl(var(--color-surface-2))',
                          border: '1px solid hsl(var(--color-border))',
                          fontSize: '0.8125rem',
                          color: 'hsl(var(--color-text-2))'
                        }}>
                          <strong>Feedback:</strong> {sub.feedback}
                        </div>
                      )}

                      {gradingId === sub.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                          <input
                            type="number"
                            placeholder="Grade (0–100)"
                            className="input-field"
                            value={gradeInput}
                            onChange={(e) => setGradeInput(e.target.value)}
                            min="0" max="100"
                          />
                          <textarea
                            placeholder="Feedback for the student…"
                            className="input-field"
                            value={feedbackInput}
                            onChange={(e) => setFeedbackInput(e.target.value)}
                          />
                          <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                            <button onClick={() => handleGradeSubmit(sub.id)}
                              className="btn btn-primary btn-sm" disabled={submittingGrade}>
                              Save grade
                            </button>
                            <button onClick={() => setGradingId(null)}
                              className="btn btn-ghost btn-sm">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setGradingId(sub.id); setGradeInput(sub.grade || ''); setFeedbackInput(sub.feedback || '') }}
                          className="btn btn-ghost btn-sm"
                          style={{ alignSelf: 'flex-start' }}
                        >
                          {sub.status === 'graded' ? 'Edit grade' : 'Grade submission'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
      </div>
    </AppShell>
  )
}

export default TeacherAssignment
