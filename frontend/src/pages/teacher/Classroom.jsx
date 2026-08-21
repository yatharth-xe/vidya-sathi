/**
 * Teacher Classroom Page — classroom info, enrolled student roster, and assignments.
 * Consumes GET /api/v1/classrooms/{classroomId} directly.
 */
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppShell from '../../components/common/AppShell'
import Sidebar from '../../components/common/Sidebar'
import PageHeader from '../../components/common/PageHeader'
import StatCard from '../../components/common/StatCard'
import AssignmentCard from '../../components/teacher/AssignmentCard'
import Loader from '../../components/common/Loader'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import teacherService from '../../services/teacherService'

const TeacherClassroom = () => {
  const { classId } = useParams()
  const navigate = useNavigate()
  const [classroom, setClassroom] = useState(null)
  const [classrooms, setClassrooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Publish Assignment Form State
  const [assignTitle, setAssignTitle] = useState('')
  const [assignDesc, setAssignDesc] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [publishMessage, setPublishMessage] = useState(null)
  const [showPublishForm, setShowPublishForm] = useState(false)

  const fetchClassroomDetails = async () => {
    if (!classId) return
    setLoading(true)
    setError(null)
    try {
      const [details, ownClassrooms] = await Promise.all([
        teacherService.getClassroom(parseInt(classId)),
        teacherService.getClassrooms().catch(() => []),
      ])
      setClassroom(details)
      setClassrooms(ownClassrooms || [])
    } catch (err) {
      setError(err.message || 'Failed to load classroom details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClassroomDetails()
  }, [classId])

  const handlePublishAssignment = async (e) => {
    e.preventDefault()
    if (!assignTitle.trim()) return
    setPublishing(true)
    setPublishMessage(null)
    try {
      await teacherService.createAssignment(
        assignTitle,
        assignDesc,
        parseInt(classId),
        dueDate || null
      )
      setPublishMessage({ type: 'success', text: 'Assignment published successfully!' })
      setAssignTitle('')
      setAssignDesc('')
      setDueDate('')
      setShowPublishForm(false)
      fetchClassroomDetails()
    } catch (err) {
      setPublishMessage({ type: 'danger', text: err.message || 'Failed to publish assignment. Please try again.' })
    } finally {
      setPublishing(false)
    }
  }

  const sidebar = <Sidebar classrooms={classrooms} />

  if (loading) {
    return (
      <AppShell sidebar={sidebar}>
        <Loader message="Loading classroom data…" />
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell sidebar={sidebar}>
        <ErrorState message={error} onRetry={fetchClassroomDetails} />
        <div style={{ textAlign: 'center', marginTop: 'var(--sp-4)' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/teacher')}>
            ← Return to Teacher Dashboard
          </button>
        </div>
      </AppShell>
    )
  }

  if (!classroom) {
    return (
      <AppShell sidebar={sidebar}>
        <EmptyState
          icon="🔍"
          title="Classroom not found"
          description="This classroom may have been removed or you do not have permission to view it."
          action={
            <button className="btn btn-primary" onClick={() => navigate('/teacher')}>
              Return to Dashboard
            </button>
          }
        />
      </AppShell>
    )
  }

  const students = classroom.students || []
  const assignments = classroom.assignments || []

  return (
    <AppShell sidebar={sidebar}>
      <PageHeader
        breadcrumb={
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/teacher')}
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}
          >
            ← Back to Classrooms
          </button>
        }
        title={classroom.name}
        description={classroom.description || 'Classroom management, student roster, and assignments.'}
        action={
          <button
            className="btn btn-primary"
            onClick={() => { setShowPublishForm((v) => !v); setPublishMessage(null) }}
            aria-expanded={showPublishForm}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Publish assignment
          </button>
        }
      />

      {/* Collapsible Publish Assignment Form */}
      {showPublishForm && (
        <div className="card card-padding" style={{ marginBottom: 'var(--sp-6)', maxWidth: 540 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--sp-2)' }}>
            Publish new assignment
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'hsl(var(--color-text-2))', marginBottom: 'var(--sp-4)', lineHeight: 1.5 }}>
            Create an assignment for students in this classroom. You can add questions and upload a PDF later.
          </p>

          {publishMessage && (
            <div className={`alert alert-${publishMessage.type}`} role="alert" style={{ marginBottom: 'var(--sp-4)' }}>
              {publishMessage.text}
            </div>
          )}

          <form onSubmit={handlePublishAssignment} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <div className="form-field">
              <label htmlFor="assign-title" className="form-label">
                Assignment Title <span aria-hidden="true" style={{ color: 'hsl(var(--color-danger))' }}>*</span>
              </label>
              <input
                id="assign-title"
                type="text"
                className="input-field"
                placeholder="e.g. Linear Equations Homework"
                value={assignTitle}
                onChange={(e) => setAssignTitle(e.target.value)}
                required
                disabled={publishing}
                autoFocus
              />
            </div>

            <div className="form-field">
              <label htmlFor="assign-desc" className="form-label">
                Instructions / Description <span style={{ color: 'hsl(var(--color-text-3))', fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea
                id="assign-desc"
                className="input-field"
                placeholder="Instructions or textbook reading references…"
                value={assignDesc}
                onChange={(e) => setAssignDesc(e.target.value)}
                disabled={publishing}
              />
            </div>

            <div className="form-field">
              <label htmlFor="assign-due" className="form-label">
                Due Date <span style={{ color: 'hsl(var(--color-text-3))', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                id="assign-due"
                type="datetime-local"
                className="input-field"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={publishing}
              />
            </div>

            <div style={{ display: 'flex', gap: 'var(--sp-3)', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => { setShowPublishForm(false); setPublishMessage(null) }}
                disabled={publishing}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={publishing || !assignTitle.trim()}>
                {publishing ? (
                  <>
                    <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} aria-hidden="true" />
                    Publishing…
                  </>
                ) : (
                  'Publish assignment'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-8)' }}>
        {/* Real Data Metrics Row */}
        <div className="grid-stats">
          <StatCard
            label="Classroom ID"
            value={`#${classroom.id}`}
            accent="primary"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <line x1="7" y1="8" x2="17" y2="8" />
              </svg>
            }
          />
          <StatCard
            label="Enrolled Students"
            value={students.length}
            accent="amber"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
            }
          />
          <StatCard
            label="Assignments"
            value={assignments.length}
            accent="success"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="1" />
              </svg>
            }
          />
        </div>

        {/* Assignments Section */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
              Published Assignments
            </h2>
            <span style={{ fontSize: '0.8125rem', color: 'hsl(var(--color-text-3))' }}>
              {assignments.length} total
            </span>
          </div>

          {assignments.length === 0 ? (
            <EmptyState
              icon="📋"
              title="No assignments published yet"
              description="Click 'Publish assignment' above to create your first assignment for this classroom."
              action={
                <button className="btn btn-primary" onClick={() => setShowPublishForm(true)}>
                  Publish assignment
                </button>
              }
            />
          ) : (
            <div className="grid-cards">
              {assignments.map((assign) => (
                <AssignmentCard key={assign.id} assignment={assign} />
              ))}
            </div>
          )}
        </div>

        {/* Enrolled Students Roster Section */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
              Enrolled Students ({students.length})
            </h2>
            <span className="text-caption text-muted">
              Classroom ID: #{classroom.id}
            </span>
          </div>

          {students.length === 0 ? (
            <EmptyState
              icon="🎒"
              title="No students enrolled yet"
              description={`Share Classroom ID #${classroom.id} with your students so they can join from their portal.`}
            />
          ) : (
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'hsl(var(--color-surface-2))', borderBottom: '1px solid hsl(var(--color-border))' }}>
                      <th style={{ padding: 'var(--sp-3) var(--sp-4)', fontWeight: 600 }}>Student Name</th>
                      <th style={{ padding: 'var(--sp-3) var(--sp-4)', fontWeight: 600 }}>Email</th>
                      <th style={{ padding: 'var(--sp-3) var(--sp-4)', fontWeight: 600 }}>Role</th>
                      <th style={{ padding: 'var(--sp-3) var(--sp-4)', fontWeight: 600 }}>Student ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid hsl(var(--color-border))' }}>
                        <td style={{ padding: 'var(--sp-3) var(--sp-4)', fontWeight: 600 }}>{s.name}</td>
                        <td style={{ padding: 'var(--sp-3) var(--sp-4)', color: 'hsl(var(--color-text-2))' }}>{s.email}</td>
                        <td style={{ padding: 'var(--sp-3) var(--sp-4)' }}>
                          <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                            {s.role}
                          </span>
                        </td>
                        <td style={{ padding: 'var(--sp-3) var(--sp-4)', color: 'hsl(var(--color-text-3))' }}>#{s.id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}

export default TeacherClassroom
