/**
 * Teacher Notifications Page — View and manage student support notifications.
 *
 * Consumes:
 *   GET /api/v1/teacher/notifications
 *   PATCH /api/v1/teacher/notifications/{id}/read
 */
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../../components/common/AppShell'
import Sidebar from '../../components/common/Sidebar'
import PageHeader from '../../components/common/PageHeader'
import Loader from '../../components/common/Loader'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import teacherService from '../../services/teacherService'

const LEVEL_BADGES = {
  1: { label: 'Doubt Cleared', badgeClass: 'badge-success' },
  2: { label: 'Guided Help', badgeClass: 'badge-primary' },
  3: { label: 'Practice Recommended', badgeClass: 'badge-warning' },
  4: { label: 'Teacher Support Recommended', badgeClass: 'badge-amber' },
}

const TeacherNotifications = () => {
  const navigate = useNavigate()
  const [classrooms, setClassrooms] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchNotificationsData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [ownClassrooms, notifyList] = await Promise.all([
        teacherService.getClassrooms().catch(() => []),
        teacherService.getNotifications(),
      ])
      setClassrooms(ownClassrooms || [])
      setNotifications(notifyList || [])
    } catch (err) {
      setError(err.message || 'Failed to load teacher notifications.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotificationsData()
  }, [])

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

  const sidebar = <Sidebar classrooms={classrooms} />

  return (
    <AppShell sidebar={sidebar}>
      <PageHeader
        breadcrumb="Teacher Portal"
        title="Student Support Notifications"
        description="Notifications requiring teacher attention when students encounter difficulty on practice quizzes or concepts."
        action={
          <button className="btn btn-ghost" onClick={() => navigate('/teacher')}>
            ← Back to Dashboard
          </button>
        }
      />

      {loading ? (
        <Loader message="Loading notifications…" />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchNotificationsData} />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon="🔔"
          title="No pending notifications"
          description="You're all caught up! No high-priority student support alerts at this time."
          action={
            <button className="btn btn-primary" onClick={() => navigate('/teacher')}>
              Return to Dashboard
            </button>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)', maxWidth: 800 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: 'hsl(var(--color-text-3))' }}>
              {notifications.length} total • {notifications.filter((n) => !n.is_read).length} unread
            </span>
          </div>

          {notifications.map((n) => {
            const isLevel4 = n.level === 4 || n.priority === 'high'
            const levelInfo = n.level ? LEVEL_BADGES[n.level] || LEVEL_BADGES[4] : null

            return (
              <div
                key={n.id}
                className="card card-padding"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--sp-3)',
                  borderLeft: isLevel4
                    ? '4px solid hsl(var(--color-amber, var(--color-warning)))'
                    : '1px solid hsl(var(--color-border))',
                  background: n.is_read ? 'hsl(var(--color-surface))' : 'hsl(var(--color-surface-2))',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                    {isLevel4 && <span className="badge badge-amber">⚠️ High Priority</span>}
                    {levelInfo && <span className={`badge ${levelInfo.badgeClass}`}>Status: {levelInfo.label}</span>}
                    {n.topic && <span className="badge badge-neutral">Topic: {n.topic}</span>}
                  </div>

                  {!n.is_read && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleMarkRead(n.id)}
                    >
                      Mark as read
                    </button>
                  )}
                </div>

                <p style={{ fontSize: '0.9375rem', color: 'hsl(var(--color-text))', margin: 0, lineHeight: 1.5 }}>
                  {n.message}
                </p>

                <div style={{ display: 'flex', gap: 'var(--sp-4)', fontSize: '0.75rem', color: 'hsl(var(--color-text-3))' }}>
                  <span>Student ID: #{n.student_id}</span>
                  {n.classroom_id && <span>Classroom ID: #{n.classroom_id}</span>}
                  {n.created_at && <span>Received: {new Date(n.created_at).toLocaleDateString()}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </AppShell>
  )
}

export default TeacherNotifications
