/**
 * Student Dashboard — welcome greeting, enrolled classrooms, recent assignments.
 * Uses AppShell, PageHeader, StatCard, ClassroomCard, AssignmentCard, EmptyState, ErrorState.
 */
import React, { useState, useEffect } from 'react'
import AppShell from '../../components/common/AppShell'
import Sidebar from '../../components/common/Sidebar'
import PageHeader from '../../components/common/PageHeader'
import StatCard from '../../components/common/StatCard'
import ClassroomCard from '../../components/student/ClassroomCard'
import AssignmentCard from '../../components/student/AssignmentCard'
import Loader from '../../components/common/Loader'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import studentService from '../../services/studentService'
import useAuth from '../../hooks/useAuth'

const Dashboard = () => {
  const { user } = useAuth()
  const [classrooms, setClassrooms] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [enrollCode, setEnrollCode] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const [enrollMessage, setEnrollMessage] = useState(null)
  const [showEnroll, setShowEnroll] = useState(false)

  const fetchDashboardData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [classData, assignData] = await Promise.all([
        studentService.getClassrooms(),
        studentService.getAssignments().catch(() => []), // fallback gracefully if no assignments yet
      ])
      setClassrooms(classData || [])
      setAssignments(assignData || [])
    } catch (err) {
      setError(err.message || 'Failed to load dashboard. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const handleEnroll = async (e) => {
    e.preventDefault()
    if (!enrollCode.trim()) return
    setEnrolling(true)
    setEnrollMessage(null)
    try {
      await studentService.enrollInClassroom(parseInt(enrollCode))
      setEnrollMessage({ type: 'success', text: 'Successfully enrolled! Your classroom is now available.' })
      setEnrollCode('')
      fetchDashboardData()
    } catch (err) {
      setEnrollMessage({ type: 'danger', text: err.message || 'Enrollment failed. Please check the classroom ID and try again.' })
    } finally {
      setEnrolling(false)
    }
  }

  const sidebar = <Sidebar classrooms={classrooms} />

  const studentName = user?.name ? user.name : 'Student'

  return (
    <AppShell sidebar={sidebar}>
      <PageHeader
        breadcrumb="Student Portal"
        title={`Welcome back, ${studentName}! 👋`}
        description="Access your enrolled classrooms, view assignments, and continue your learning journey."
        action={
          <button
            className="btn btn-primary"
            onClick={() => { setShowEnroll(v => !v); setEnrollMessage(null) }}
            aria-expanded={showEnroll}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Join a classroom
          </button>
        }
      />

      {/* Enroll Form Collapsible */}
      {showEnroll && (
        <div
          className="card card-padding"
          style={{ marginBottom: 'var(--sp-6)', maxWidth: 480 }}
        >
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1rem',
            fontWeight: 600,
            marginBottom: 'var(--sp-2)',
          }}>
            Join a classroom
          </h2>
          <p style={{
            fontSize: '0.8125rem',
            color: 'hsl(var(--color-text-2))',
            marginBottom: 'var(--sp-4)',
            lineHeight: 1.5,
          }}>
            Enter the classroom ID shared by your teacher to join their class.
          </p>

          {enrollMessage && (
            <div className={`alert alert-${enrollMessage.type}`} role="alert" style={{ marginBottom: 'var(--sp-4)' }}>
              {enrollMessage.text}
            </div>
          )}

          <form onSubmit={handleEnroll} style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
            <div className="form-field" style={{ flex: 1, minWidth: 160 }}>
              <label htmlFor="enroll-code" className="form-label">Classroom ID</label>
              <input
                id="enroll-code"
                type="number"
                className="input-field"
                placeholder="e.g. 12"
                value={enrollCode}
                onChange={(e) => setEnrollCode(e.target.value)}
                min="1"
                required
                disabled={enrolling}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--sp-2)', flexShrink: 0 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => { setShowEnroll(false); setEnrollMessage(null) }}
                disabled={enrolling}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={enrolling || !enrollCode.trim()}
              >
                {enrolling ? (
                  <>
                    <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} aria-hidden="true" />
                    Joining…
                  </>
                ) : 'Join classroom'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <Loader message="Loading your student dashboard…" />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchDashboardData} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-8)' }}>
          {/* StatCards Row */}
          <div className="grid-stats">
            <StatCard
              label="Enrolled Classrooms"
              value={classrooms.length}
              accent="primary"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
                </svg>
              }
            />
            <StatCard
              label="Total Assignments"
              value={assignments.length}
              accent="amber"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                  <rect x="9" y="3" width="6" height="4" rx="1" />
                </svg>
              }
            />
          </div>

          {/* My Classrooms Section */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
                My Classrooms
              </h2>
              <span style={{ fontSize: '0.8125rem', color: 'hsl(var(--color-text-3))' }}>
                {classrooms.length} {classrooms.length === 1 ? 'classroom' : 'classrooms'}
              </span>
            </div>

            {classrooms.length === 0 ? (
              <EmptyState
                icon="🎒"
                title="You're not in any classrooms yet"
                description="Ask your teacher for the classroom ID and click 'Join a classroom' to get started."
                action={
                  <button className="btn btn-primary" onClick={() => setShowEnroll(true)}>
                    Join a classroom
                  </button>
                }
              />
            ) : (
              <div className="grid-cards">
                {classrooms.map((c) => (
                  <ClassroomCard key={c.id} classroom={c} />
                ))}
              </div>
            )}
          </div>

          {/* Recent Assignments Quick Access Section */}
          {assignments.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
                  Recent Assignments
                </h2>
                <span style={{ fontSize: '0.8125rem', color: 'hsl(var(--color-text-3))' }}>
                  {assignments.length} total
                </span>
              </div>
              <div className="grid-cards">
                {assignments.slice(0, 4).map((assign) => (
                  <AssignmentCard key={assign.id} assignment={assign} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </AppShell>
  )
}

export default Dashboard
