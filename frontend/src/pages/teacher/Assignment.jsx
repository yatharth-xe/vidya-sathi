import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../../components/common/Navbar'
import Sidebar from '../../components/common/Sidebar'
import PDFViewer from '../../components/student/PDFViewer'
import Loader from '../../components/common/Loader'
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
      alert('Failed to update grade.')
    } finally {
      setSubmittingGrade(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <div style={{ display: 'flex', flex: 1 }}>
          <Sidebar classrooms={classrooms} />
          <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader />
          </main>
        </div>
      </div>
    )
  }

  if (!assignment) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <div style={{ display: 'flex', flex: 1 }}>
          <Sidebar classrooms={classrooms} />
          <main className="main-content">
            <span
              onClick={() => navigate(`/teacher/classroom/${classId}`)}
              style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', cursor: 'pointer' }}
            >
              ← Back to Classroom
            </span>
            <h3 style={{ marginTop: '1rem' }}>Assignment not found</h3>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar classrooms={classrooms} />
        <main className="main-content" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div>
            <span
              onClick={() => navigate(`/teacher/classroom/${classId}`)}
              style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', cursor: 'pointer' }}
            >
              ← Back to Classroom
            </span>
            <h1 style={{ fontSize: '2rem', marginTop: '0.5rem' }}>{assignment.title}</h1>
            <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.95rem', marginTop: '0.25rem' }}>
              {assignment.description || 'No specific instructions provided.'}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
            
            {/* PDF / Materials viewer */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem' }}>Assignment Document</h3>
              <PDFViewer title={assignment.title} fileUrl={assignment.file_path} />
            </div>

            {/* Student Submissions List & Grading */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem' }}>Student Submissions ({submissions.length})</h3>
              
              {submissions.length === 0 ? (
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                  <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.9rem' }}>
                    No student submissions recorded yet for this assignment.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {submissions.map((sub) => (
                    <div key={sub.id} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h4 style={{ fontSize: '1rem', fontWeight: '600' }}>
                            {sub.student_name || `Student #${sub.student_id}`}
                          </h4>
                          <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                            Submitted on {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '12px',
                          background: sub.status === 'graded' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(250, 204, 21, 0.15)',
                          color: sub.status === 'graded' ? '#4ade80' : '#facc15',
                          fontWeight: '600'
                        }}>
                          {sub.status.toUpperCase()}
                        </span>
                      </div>

                      {sub.grade !== null && sub.grade !== undefined && (
                        <div style={{ fontSize: '0.9rem', color: 'hsl(var(--text-secondary))' }}>
                          <strong>Grade:</strong> {sub.grade}/100
                        </div>
                      )}

                      {sub.feedback && (
                        <div style={{
                          padding: '0.75rem',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid hsl(var(--border-color))',
                          fontSize: '0.85rem'
                        }}>
                          <strong>Feedback:</strong> {sub.feedback}
                        </div>
                      )}

                      {gradingId === sub.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                          <input
                            type="number"
                            placeholder="Grade (0-100)"
                            className="input-field"
                            value={gradeInput}
                            onChange={(e) => setGradeInput(e.target.value)}
                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                          />
                          <textarea
                            placeholder="Add feedback for student..."
                            className="input-field"
                            value={feedbackInput}
                            onChange={(e) => setFeedbackInput(e.target.value)}
                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem', minHeight: '60px' }}
                          />
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleGradeSubmit(sub.id)}
                              className="btn-primary"
                              disabled={submittingGrade}
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                            >
                              Save Grade
                            </button>
                            <button
                              onClick={() => setGradingId(null)}
                              className="btn-secondary"
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setGradingId(sub.id)
                            setGradeInput(sub.grade || '')
                            setFeedbackInput(sub.feedback || '')
                          }}
                          className="btn-secondary"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', alignSelf: 'flex-start' }}
                        >
                          {sub.status === 'graded' ? 'Edit Grade' : 'Grade Submission'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </main>
      </div>
    </div>
  )
}

export default TeacherAssignment
