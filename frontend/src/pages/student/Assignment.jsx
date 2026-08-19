import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../../components/common/Navbar'
import Sidebar from '../../components/common/Sidebar'
import PDFViewer from '../../components/student/PDFViewer'
import Quiz from '../../components/student/Quiz'
import Loader from '../../components/common/Loader'
import studentService from '../../services/studentService'

const Assignment = () => {
  const { classId, assignId } = useParams()
  const navigate = useNavigate()
  const [classrooms, setClassrooms] = useState([])
  const [assignment, setAssignment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const list = await studentService.getClassrooms()
        setClassrooms(list)
        
        const currentClass = list.find(c => c.id === parseInt(classId))
        const currentAssign = currentClass?.assignments?.find(a => a.id === parseInt(assignId))
        setAssignment(currentAssign)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [classId, assignId])

  const handleManualSubmit = async () => {
    setSubmitting(true)
    try {
      await studentService.submitAssignment(parseInt(assignId))
      alert('Assignment submitted successfully!')
      navigate(`/student/classroom/${classId}`)
    } catch (err) {
      alert('Submission failed.')
    } finally {
      setSubmitting(false)
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
            <h3>Assignment not found</h3>
          </main>
        </div>
      </div>
    )
  }

  const submission = assignment.submissions?.[0]
  const status = submission ? submission.status : 'pending'

  // Mock quiz setup
  const mockQuiz = {
    title: `Assessment for ${assignment.title}`,
    questions: [
      {
        id: 1,
        question_text: "Which of the following represents a linear equation?",
        option_a: "y = mx + c",
        option_b: "y = ax^2 + bx + c",
        option_c: "xy = c",
        option_d: "x^2 + y^2 = r^2",
        correct_option: "A"
      },
      {
        id: 2,
        question_text: "What is the degree of a quadratic polynomial?",
        option_a: "1",
        option_b: "2",
        option_c: "3",
        option_d: "Variable",
        correct_option: "B"
      }
    ]
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar classrooms={classrooms} />
        <main className="main-content" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div>
            <span
              onClick={() => navigate(`/student/classroom/${classId}`)}
              style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', cursor: 'pointer' }}
            >
              ← Back to Classroom
            </span>
            <h1 style={{ fontSize: '2rem', marginTop: '0.5rem' }}>{assignment.title}</h1>
            <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.95rem', marginTop: '0.25rem' }}>
              {assignment.description}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
            
            {/* Document PDF Viewer */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem' }}>Study Resources</h3>
              <PDFViewer title={assignment.title} fileUrl={assignment.file_path} />
            </div>

            {/* Quiz or submission details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem' }}>Assignment Tasks</h3>
              
              {status === 'pending' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <Quiz quiz={mockQuiz} />
                  
                  <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <h4 style={{ marginBottom: '0.5rem' }}>Submit Study File</h4>
                    <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', marginBottom: '1rem' }}>
                      If you've completed written questions, submit them directly.
                    </p>
                    <button
                      onClick={handleManualSubmit}
                      className="btn-primary"
                      disabled={submitting}
                      style={{ width: '100%' }}
                    >
                      {submitting ? 'Submitting...' : 'Mark as Completed'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                  <h4 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Assignment Submitted</h4>
                  <p style={{ fontSize: '0.9rem', color: 'hsl(var(--text-secondary))' }}>
                    Your work was successfully turned in. Awaiting teacher grade.
                  </p>
                  {submission?.feedback && (
                    <div style={{
                      marginTop: '1.5rem',
                      padding: '1rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid hsl(var(--border-color))',
                      textAlign: 'left'
                    }}>
                      <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', fontWeight: '600' }}>
                        Teacher's Feedback
                      </span>
                      <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>{submission.feedback}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

        </main>
      </div>
    </div>
  )
}

export default Assignment
