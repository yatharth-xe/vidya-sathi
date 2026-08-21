/**
 * Teacher Classroom page — analytics + assignments + AI insights panel.
 * Uses AppShell for consistent layout.
 * API + auth logic unchanged.
 */
import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import AppShell from '../../components/common/AppShell'
import Sidebar from '../../components/common/Sidebar'
import PageHeader from '../../components/common/PageHeader'
import AssignmentCard from '../../components/teacher/AssignmentCard'
import AnalyticsCard from '../../components/teacher/AnalyticsCard'
import WeakTopicTable from '../../components/teacher/WeakTopicTable'
import DifficultQuestionTable from '../../components/teacher/DifficultQuestionTable'
import RiskStudentTable from '../../components/teacher/RiskStudentTable'
import Loader from '../../components/common/Loader'
import EmptyState from '../../components/common/EmptyState'
import teacherService from '../../services/teacherService'

const Classroom = () => {
  const { classId } = useParams()
  const [classroom, setClassroom] = useState(null)
  const [classrooms, setClassrooms] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  const [assignTitle, setAssignTitle] = useState('')
  const [assignDesc, setAssignDesc] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState('')
  const [showPublishForm, setShowPublishForm] = useState(false)

  const [insights, setInsights] = useState('')
  const [loadingInsights, setLoadingInsights] = useState(false)

  const fetchData = async () => {
    try {
      const list = await teacherService.getClassrooms()
      setClassrooms(list)
      const details = list.find(c => c.id === parseInt(classId))
      setClassroom(details)
      const stats = await teacherService.getClassroomAnalytics(parseInt(classId))
      setAnalytics(stats)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [classId])

  const fetchAIInsights = async () => {
    setLoadingInsights(true)
    try {
      const response = await fetch(`/api/v1/teacher/insights/${classId}`)
      const data = await response.json()
      setInsights(data.insights)
    } catch {
      setInsights('Unable to load AI insights. Please try again later.')
    } finally {
      setLoadingInsights(false)
    }
  }

  const handlePublishAssignment = async (e) => {
    e.preventDefault()
    if (!assignTitle.trim()) return
    setPublishing(true)
    setPublishError('')
    try {
      await teacherService.createAssignment(assignTitle, assignDesc, parseInt(classId))
      setAssignTitle('')
      setAssignDesc('')
      setShowPublishForm(false)
      fetchData()
    } catch {
      setPublishError('Failed to publish assignment. Please try again.')
    } finally {
      setPublishing(false)
    }
  }

  const sidebar = <Sidebar classrooms={classrooms} />

  if (loading) {
    return (
      <AppShell sidebar={sidebar}>
        <Loader message="Loading classroom…" />
      </AppShell>
    )
  }

  if (!classroom) {
    return (
      <AppShell sidebar={sidebar}>
        <EmptyState
          icon="🔍"
          title="Classroom not found"
          description="This classroom may have been removed or you don't have access to it."
        />
      </AppShell>
    )
  }

  return (
    <AppShell sidebar={sidebar}>
      <PageHeader
        breadcrumb="Classrooms"
        title={classroom.name}
        description={classroom.description || 'Classroom analytics and assignment management.'}
        action={
          <button
            className="btn btn-primary"
            onClick={() => setShowPublishForm(v => !v)}
            aria-expanded={showPublishForm}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Publish assignment
          </button>
        }
      />

      {/* Publish assignment form */}
      {showPublishForm && (
        <div className="card card-padding" style={{ marginBottom: 'var(--sp-6)', maxWidth: 540 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 600, marginBottom: 'var(--sp-4)' }}>
            Publish new assignment
          </h2>
          {publishError && (
            <div className="alert alert-danger" role="alert" style={{ marginBottom: 'var(--sp-4)' }}>{publishError}</div>
          )}
          <form onSubmit={handlePublishAssignment} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <div className="form-field">
              <label htmlFor="assign-title" className="form-label">Title <span aria-hidden="true" style={{ color: 'hsl(var(--color-danger))' }}>*</span></label>
              <input
                id="assign-title"
                type="text"
                className="input-field"
                placeholder="e.g. Chapter 3 Quiz"
                value={assignTitle}
                onChange={(e) => setAssignTitle(e.target.value)}
                required
                disabled={publishing}
                autoFocus
              />
            </div>
            <div className="form-field">
              <label htmlFor="assign-desc" className="form-label">Instructions <span style={{ color: 'hsl(var(--color-text-3))', fontWeight: 400 }}>(optional)</span></label>
              <textarea
                id="assign-desc"
                className="input-field"
                placeholder="Instructions or reading references…"
                value={assignDesc}
                onChange={(e) => setAssignDesc(e.target.value)}
                disabled={publishing}
              />
            </div>
            <div style={{ display: 'flex', gap: 'var(--sp-3)', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost"
                onClick={() => { setShowPublishForm(false); setPublishError('') }}
                disabled={publishing}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={publishing || !assignTitle.trim()}>
                {publishing ? (
                  <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} aria-hidden="true" /> Publishing…</>
                ) : 'Publish'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--sp-6)' }}>
        {/* Main column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)', minWidth: 0 }}>

          {/* Analytics row */}
          {analytics && <AnalyticsCard analytics={analytics} />}

          {/* Insights + weak tables */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
            {analytics && <WeakTopicTable topics={analytics.common_weak_topics} />}
            <DifficultQuestionTable />
          </div>

          {/* Risk students */}
          <RiskStudentTable />

          {/* Assignments section */}
          <div>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.0625rem',
              fontWeight: 600,
              marginBottom: 'var(--sp-4)',
              color: 'hsl(var(--color-text))',
            }}>
              Published assignments
            </h2>
            {!classroom.assignments?.length ? (
              <EmptyState
                icon="📋"
                title="No assignments yet"
                description="Use the 'Publish assignment' button above to add your first one."
              />
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 'var(--sp-4)',
              }}>
                {classroom.assignments.map(assign => (
                  <AssignmentCard key={assign.id} assignment={assign} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right panel — AI Insights */}
        <div style={{ width: 300, flexShrink: 0 }}>
          <div className="card card-padding" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <div>
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '0.9375rem',
                fontWeight: 600,
                marginBottom: 'var(--sp-1)',
              }}>
                AI Classroom Assistant
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'hsl(var(--color-text-2))', lineHeight: 1.5 }}>
                Generate a performance analysis and intervention suggestions for this classroom using Gemini AI.
              </p>
            </div>

            <button
              onClick={fetchAIInsights}
              disabled={loadingInsights}
              className="btn btn-primary btn-full"
            >
              {loadingInsights ? (
                <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} aria-hidden="true" /> Analysing…</>
              ) : 'Generate insights'}
            </button>

            {insights && (
              <div style={{
                padding: 'var(--sp-4)',
                borderRadius: 'var(--r-md)',
                background: 'hsl(var(--color-surface-2))',
                border: '1px solid hsl(var(--color-border))',
                fontSize: '0.8125rem',
                lineHeight: 1.65,
                color: 'hsl(var(--color-text-2))',
                maxHeight: 260,
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
              }}>
                {insights}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}

export default Classroom
