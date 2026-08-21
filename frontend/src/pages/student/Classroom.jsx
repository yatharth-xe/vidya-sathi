/**
 * Student Classroom page — view classroom info, teacher details, and assignments.
 * Uses GET /api/v1/classrooms/{classroom_id} directly.
 */
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppShell from '../../components/common/AppShell'
import Sidebar from '../../components/common/Sidebar'
import PageHeader from '../../components/common/PageHeader'
import AssignmentCard from '../../components/student/AssignmentCard'
import DoubtChat from '../../components/student/DoubtChat'
import Loader from '../../components/common/Loader'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import studentService from '../../services/studentService'

const Classroom = () => {
  const { classId } = useParams()
  const navigate = useNavigate()
  const [classroom, setClassroom] = useState(null)
  const [classrooms, setClassrooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('assignments')

  const fetchClassroomData = async () => {
    if (!classId) return
    setLoading(true)
    setError(null)
    try {
      const [classDetails, enrolledList] = await Promise.all([
        studentService.getClassroom(parseInt(classId)),
        studentService.getClassrooms().catch(() => []),
      ])
      setClassroom(classDetails)
      setClassrooms(enrolledList || [])
    } catch (err) {
      setError(err.message || 'Failed to load classroom details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClassroomData()
  }, [classId])

  const sidebar = <Sidebar classrooms={classrooms} />

  if (loading) {
    return (
      <AppShell sidebar={sidebar}>
        <Loader message="Loading classroom…" />
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell sidebar={sidebar}>
        <ErrorState
          message={error}
          onRetry={fetchClassroomData}
        />
        <div style={{ textAlign: 'center', marginTop: 'var(--sp-4)' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/student')}>
            ← Back to Student Dashboard
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
          description="You may not be enrolled in this classroom or it may no longer exist."
          action={
            <button className="btn btn-primary" onClick={() => navigate('/student')}>
              Back to Dashboard
            </button>
          }
        />
      </AppShell>
    )
  }

  const TABS = [
    { id: 'assignments', label: 'Assignments' },
    { id: 'doubt-chat', label: 'AI Tutor (Ask Doubt)' },
  ]

  return (
    <AppShell sidebar={sidebar}>
      <PageHeader
        breadcrumb={
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/student')} style={{ padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}>
            ← Back to Dashboard
          </button>
        }
        title={classroom.name}
        description={
          classroom.teacher?.name
            ? `Taught by ${classroom.teacher.name}${classroom.description ? ` • ${classroom.description}` : ''}`
            : classroom.description || undefined
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
        {/* Navigation Tabs */}
        <div className="tabs" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`tab-item${activeTab === tab.id ? ' active' : ''}`}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Panel Content */}
        <div role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
          {activeTab === 'assignments' ? (
            !classroom.assignments || classroom.assignments.length === 0 ? (
              <EmptyState
                icon="📋"
                title="No assignments yet"
                description="Your teacher hasn't published any assignments for this classroom yet."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
                <div style={{ fontSize: '0.875rem', color: 'hsl(var(--color-text-3))' }}>
                  {classroom.assignments.length} {classroom.assignments.length === 1 ? 'assignment' : 'assignments'} available
                </div>
                <div className="grid-cards">
                  {classroom.assignments.map((assign) => (
                    <AssignmentCard key={assign.id} assignment={assign} />
                  ))}
                </div>
              </div>
            )
          ) : (
            <div style={{ maxWidth: 720 }}>
              <DoubtChat />
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}

export default Classroom
