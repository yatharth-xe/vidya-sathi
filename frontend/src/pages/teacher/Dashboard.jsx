/**
 * Teacher Dashboard — real backend data overview for classrooms, assignments, and notifications.
 *
 * Metrics:
 *   - Total Classrooms
 *   - Unique Students (distinct student IDs across all classrooms)
 *   - Total Assignments
 *   - Notifications Requiring Attention
 */
import React, { useState, useEffect } from 'react'
import AppShell from '../../components/common/AppShell'
import Sidebar from '../../components/common/Sidebar'
import PageHeader from '../../components/common/PageHeader'
import StatCard from '../../components/common/StatCard'
import ClassroomCard from '../../components/teacher/ClassroomCard'
import Loader from '../../components/common/Loader'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import teacherService from '../../services/teacherService'
import useAuth from '../../hooks/useAuth'

const LEVEL_BADGES = {
  1: { label: 'Doubt Cleared', badgeClass: 'badge-success' },
  2: { label: 'Guided Help', badgeClass: 'badge-primary' },
  3: { label: 'Practice Recommended', badgeClass: 'badge-warning' },
  4: { label: 'Teacher Support Recommended', badgeClass: 'badge-amber' },
}

const TeacherDashboard = () => {
  const { user } = useAuth()
  const [classrooms, setClassrooms] = useState([])
  const [assignments, setAssignments] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Create Classroom Form State
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [createMessage, setCreateMessage] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const fetchDashboardData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [classData, assignData, notifyData] = await Promise.all([
        teacherService.getClassrooms(),
        teacherService.getAssignments().catch(() => []),
        teacherService.getNotifications().catch(() => []),
      ])
      setClassrooms(classData || [])
      setAssignments(assignData || [])
      setNotifications(notifyData || [])
    } catch (err) {
      setError(err.message || 'Failed to load teacher dashboard data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const handleCreateClassroom = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    setCreateMessage(null)
    try {
      await teacherService.createClassroom(name, description)
      setCreateMessage({ type: 'success', text: 'Classroom created successfully!' })
      setName('')
      setDescription('')
      setShowForm(false)
      fetchDashboardData()
    } catch (err) {
      setCreateMessage({ type: 'danger', text: err.message || 'Could not create classroom. Please try again.' })
    } finally {
      setCreating(false)
    }
  }

  const handleMarkRead = async (notificationId) => {
    try {
      await teacherService.markNotificationRead(notificationId)
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      )
    } catch (err) {
      console.error('Failed to mark notification read:', err)
    }
  }

  // Calculate Unique Students (distinct student IDs across all classrooms)
  const uniqueStudentIds = new Set(
    classrooms.flatMap((c) => (c.students || []).map((s) => s.id))
  )
  const uniqueStudentsCount = uniqueStudentIds.size

  // Notifications requiring attention (unread or Level 4 or high priority)
  const attentionNotifications = notifications.filter((n) => !n.is_read || n.priority === 'high' || n.level === 4)

  const sidebar = <Sidebar classrooms={classrooms} />

  const teacherName = user?.name ? user.name : 'Teacher'

  return (
    <AppShell sidebar={sidebar}>
      <PageHeader
        breadcrumb="Teacher Portal"
        title={`Welcome back, ${teacherName}! 👋`}
        description="Overview of your classrooms, active assignments, and student support notifications."
        action={
          <button
            className="btn btn-primary"
            onClick={() => { setShowForm((v) => !v); setCreateMessage(null) }}
            aria-expanded={showForm}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New classroom
          </button>
        }
      />

      {/* Collapsible Create Classroom Form */}
      {showForm && (
        <div className="card card-padding" style={{ marginBottom: 'var(--sp-6)', maxWidth: 520 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--sp-2)' }}>
            Create a new classroom
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'hsl(var(--color-text-2))', marginBottom: 'var(--sp-4)', lineHeight: 1.5 }}>
            Students can join using the unique Classroom ID generated after creation.
          </p>

          {createMessage && (
            <div className={`alert alert-${createMessage.type}`} role="alert" style={{ marginBottom: 'var(--sp-4)' }}>
              {createMessage.text}
            </div>
          )}

          <form onSubmit={handleCreateClassroom} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <div className="form-field">
              <label htmlFor="class-name" className="form-label">
                Classroom Name <span aria-hidden="true" style={{ color: 'hsl(var(--color-danger))' }}>*</span>
              </label>
              <input
                id="class-name"
                type="text"
                className="input-field"
                placeholder="e.g. Mathematics — Class X"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={creating}
                autoFocus
              />
            </div>

            <div className="form-field">
              <label htmlFor="class-desc" className="form-label">
                Description <span style={{ color: 'hsl(var(--color-text-3))', fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea
                id="class-desc"
                className="input-field"
                placeholder="Brief overview of topics, schedule, or goals…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={creating}
              />
            </div>

            <div style={{ display: 'flex', gap: 'var(--sp-3)', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => { setShowForm(false); setCreateMessage(null) }}
                disabled={creating}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={creating || !name.trim()}>
                {creating ? (
                  <>
                    <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} aria-hidden="true" />
                    Creating…
                  </>
                ) : (
                  'Create classroom'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <Loader message="Loading teacher dashboard data…" />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchDashboardData} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-8)' }}>
          {/* Metrics Row (Real Data Only) */}
          <div className="grid-stats">
            <StatCard
              label="Total Classrooms"
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
              label="Unique Students"
              value={uniqueStudentsCount}
              accent="amber"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87" />
                  <path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
              }
            />
            <StatCard
              label="Total Assignments"
              value={assignments.length}
              accent="success"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                  <rect x="9" y="3" width="6" height="4" rx="1" />
                </svg>
              }
            />
            <StatCard
              label="Support Notifications"
              value={attentionNotifications.length}
              accent={attentionNotifications.length > 0 ? 'danger' : 'primary'}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 01-3.46 0" />
                </svg>
              }
            />
          </div>

          {/* Teacher Support Notifications Section */}
          {notifications.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, fontFamily: 'var(--font-display)' }}>
                  Student Support Notifications
                </h2>
                <span style={{ fontSize: '0.8125rem', color: 'hsl(var(--color-text-3))' }}>
                  {notifications.filter((n) => !n.is_read).length} unread
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                {notifications.map((n) => {
                  const isLevel4 = n.level === 4 || n.priority === 'high'
                  const levelInfo = n.level ? LEVEL_BADGES[n.level] || LEVEL_BADGES[4] : null

                  return (
                    <div
                      key={n.id}
                      className="card"
                      style={{
                        padding: 'var(--sp-4)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--sp-2)',
                        borderLeft: isLevel4
                          ? '4px solid hsl(var(--color-amber, var(--color-warning)))'
                          : '1px solid hsl(var(--color-border))',
                        background: n.is_read
                          ? 'hsl(var(--color-surface))'
                          : isLevel4
                          ? 'hsl(var(--color-surface-2))'
                          : 'hsl(var(--color-surface))',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                          {isLevel4 && (
                            <span className="badge badge-amber" style={{ fontSize: '0.6875rem' }}>
                              ⚠️ High Priority
                            </span>
                          )}
                          {levelInfo && (
                            <span className={`badge ${levelInfo.badgeClass}`} style={{ fontSize: '0.6875rem' }}>
                              Status: {levelInfo.label}
                            </span>
                          )}
                          {n.topic && (
                            <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
                              Topic: {n.topic}
                            </span>
                          )}
                        </div>

                        {!n.is_read && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleMarkRead(n.id)}
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                          >
                            Mark as read
                          </button>
                        )}
                      </div>

                      <p style={{ fontSize: '0.875rem', color: 'hsl(var(--color-text))', margin: 0, lineHeight: 1.5 }}>
                        {n.message}
                      </p>

                      <div style={{ display: 'flex', gap: 'var(--sp-4)', fontSize: '0.75rem', color: 'hsl(var(--color-text-3))' }}>
                        <span>Student ID: #{n.student_id}</span>
                        {n.created_at && (
                          <span>Date: {new Date(n.created_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Classrooms Section */}
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
                icon="🏫"
                title="No classrooms created yet"
                description="Click 'New classroom' above to create your first classroom and start publishing assignments."
                action={
                  <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                    Create a classroom
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
        </div>
      )}
    </AppShell>
  )
}

export default TeacherDashboard
