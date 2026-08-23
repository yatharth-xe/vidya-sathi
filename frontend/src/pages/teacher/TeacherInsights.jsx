/**
 * TeacherInsights — Real Teacher Agent AI Analytics & Insights Page.
 *
 * Consumes:
 *   GET  /api/v1/classrooms/
 *   POST /api/v1/agents/teacher/insights/{classroom_id}
 *   GET  /api/v1/agents/teacher/insights/{classroom_id}
 *
 * Displays:
 *   1. Classroom Summary & Selector
 *   2. Real Metric StatCards (Independent Completion %, Level 3/4 Counts, Weak Topics)
 *   3. AI-Generated Teacher Agent Insight Narrative
 *   4. Weak Topics Table
 *   5. Difficult Questions Table
 *   6. Students Requiring Support Roster (Level 3 & Level 4)
 *   7. Support Notifications
 */
import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppShell from '../../components/common/AppShell'
import Sidebar from '../../components/common/Sidebar'
import PageHeader from '../../components/common/PageHeader'
import StatCard from '../../components/common/StatCard'
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

const TeacherInsights = () => {
  const navigate = useNavigate()
  const { classId } = useParams()

  const [classrooms, setClassrooms] = useState([])
  const [selectedClassId, setSelectedClassId] = useState(classId ? parseInt(classId) : null)
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingInsights, setLoadingInsights] = useState(false)
  const [error, setError] = useState(null)

  // Initial load: fetch teacher's classrooms
  useEffect(() => {
    const initClassrooms = async () => {
      try {
        const list = await teacherService.getClassrooms()
        setClassrooms(list || [])
        if (list && list.length > 0 && !selectedClassId) {
          setSelectedClassId(list[0].id)
        }
      } catch (err) {
        setError(err.message || 'Failed to load teacher classrooms.')
      } finally {
        setLoading(false)
      }
    }
    initClassrooms()
  }, [])

  // Fetch Teacher Agent Insights whenever selected classroom changes
  const fetchInsights = async (targetClassId) => {
    if (!targetClassId) return
    setLoadingInsights(true)
    setError(null)
    try {
      const data = await teacherService.getAgentInsights(targetClassId)
      setInsights(data)
    } catch (err) {
      setError(err.message || 'Failed to load Teacher Agent insights.')
    } finally {
      setLoadingInsights(false)
    }
  }

  useEffect(() => {
    if (selectedClassId) {
      fetchInsights(selectedClassId)
    }
  }, [selectedClassId])

  const handleClassChange = (e) => {
    const newId = parseInt(e.target.value)
    setSelectedClassId(newId)
  }

  const sidebar = <Sidebar classrooms={classrooms} />

  if (loading) {
    return (
      <AppShell sidebar={sidebar}>
        <Loader message="Loading classrooms…" />
      </AppShell>
    )
  }

  if (classrooms.length === 0) {
    return (
      <AppShell sidebar={sidebar}>
        <EmptyState
          icon="🧠"
          title="No Classrooms Found"
          description="Create a classroom first to view AI-generated learning insights and student analytics."
          action={
            <button className="btn btn-primary" onClick={() => navigate('/teacher')}>
              Create Classroom
            </button>
          }
        />
      </AppShell>
    )
  }

  return (
    <AppShell sidebar={sidebar}>
      <PageHeader
        breadcrumb="Teacher Portal"
        title="AI Student Insights & Classroom Analytics"
        description="Deterministic learning metrics and grounded AI Teacher Agent recommendations."
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <label htmlFor="classroom-select" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'hsl(var(--color-text-2))' }}>
              Select Classroom:
            </label>
            <select
              id="classroom-select"
              className="input-field"
              value={selectedClassId || ''}
              onChange={handleClassChange}
              style={{ width: 'auto', minWidth: 200 }}
            >
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (#{c.id})
                </option>
              ))}
            </select>
          </div>
        }
      />

      {loadingInsights ? (
        <Loader message="Gathering deterministic analytics & running Teacher Agent reasoning…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchInsights(selectedClassId)} />
      ) : !insights ? (
        <EmptyState
          icon="📊"
          title="No Insights Available"
          description="Could not load analytics for this classroom."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
          {/* Top Real Metrics Row */}
          <div className="grid-stats">
            <StatCard
              label="Independent Completion"
              value={`${insights.independent_completion_percentage?.toFixed(1)}%`}
              accent="primary"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              }
            />
            <StatCard
              label="Level 3 Students (Practice)"
              value={insights.level_3_count || 0}
              accent="amber"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              }
            />
            <StatCard
              label="Level 4 Students (High Priority)"
              value={insights.level_4_count || 0}
              accent={insights.level_4_count > 0 ? 'danger' : 'success'}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              }
            />
            <StatCard
              label="Identified Weak Topics"
              value={insights.weak_topics?.length || 0}
              accent="neutral"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              }
            />
          </div>

          {/* AI Teacher Agent Insights Box */}
          <div
            className="card card-padding"
            style={{
              background: 'hsl(var(--color-surface-2))',
              border: '1.5px solid hsl(var(--color-primary-dim, var(--color-border)))',
              borderRadius: 'var(--r-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--sp-3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: 'hsl(var(--color-primary))',
                  flexShrink: 0,
                }}
                aria-hidden="true"
              />
              <h2 style={{ fontSize: '1rem', fontWeight: 600, fontFamily: 'var(--font-display)', margin: 0 }}>
                Teacher Agent AI Narrative Insight
              </h2>
              <span className="badge badge-primary" style={{ fontSize: '0.6875rem', marginLeft: 'auto' }}>
                Grounded Reasoning
              </span>
            </div>

            {insights.insights_text?.includes('temporarily unavailable') ? (
              <div className="alert alert-info" style={{ fontSize: '0.875rem' }}>
                ℹ️ AI narrative temporarily unavailable. Review deterministic analytics below.
              </div>
            ) : (
              <p style={{ fontSize: '0.9375rem', color: 'hsl(var(--color-text))', lineHeight: 1.6, margin: 0 }}>
                {insights.insights_text || 'No narrative insights generated.'}
              </p>
            )}
          </div>

          {/* Grid Layout: Weak Topics & Difficult Questions */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--sp-6)' }}>
            {/* Weak Topics Section */}
            <div className="card card-padding" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, fontFamily: 'var(--font-display)', margin: 0 }}>
                  Weak Topics ({insights.weak_topics?.length || 0})
                </h3>
              </div>

              {!insights.weak_topics || insights.weak_topics.length === 0 ? (
                <p style={{ fontSize: '0.875rem', color: 'hsl(var(--color-text-3))', margin: 0 }}>
                  No weak topics identified for this classroom.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                  {insights.weak_topics.map((t, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justify: 'space-between',
                        alignItems: 'center',
                        padding: 'var(--sp-2) var(--sp-3)',
                        borderRadius: 'var(--r-md)',
                        background: 'hsl(var(--color-surface))',
                        border: '1px solid hsl(var(--color-border))',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block' }}>
                          {t.topic}
                        </span>
                        {t.subject && (
                          <span style={{ fontSize: '0.75rem', color: 'hsl(var(--color-text-3))' }}>
                            Subject: {t.subject}
                          </span>
                        )}
                      </div>
                      {t.affected_students > 0 && (
                        <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
                          {t.affected_students} struggling
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Difficult Questions Section */}
            <div className="card card-padding" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, fontFamily: 'var(--font-display)', margin: 0 }}>
                  Difficult Questions ({insights.difficult_questions?.length || 0})
                </h3>
              </div>

              {!insights.difficult_questions || insights.difficult_questions.length === 0 ? (
                <p style={{ fontSize: '0.875rem', color: 'hsl(var(--color-text-3))', margin: 0 }}>
                  No high-struggle questions recorded.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                  {insights.difficult_questions.map((q) => (
                    <div
                      key={q.question_id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--sp-1)',
                        padding: 'var(--sp-2) var(--sp-3)',
                        borderRadius: 'var(--r-md)',
                        background: 'hsl(var(--color-surface))',
                        border: '1px solid hsl(var(--color-border))',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'hsl(var(--color-primary))' }}>
                          {q.question_text || `Question #${q.question_id}`}
                        </span>
                        <span className="badge badge-amber" style={{ fontSize: '0.75rem' }}>
                          {q.difficulty_percentage?.toFixed(1)}% struggle
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'hsl(var(--color-text-3))' }}>
                        {q.students_struggling} student(s) struggling
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Students Requiring Intervention Roster */}
          <div className="card card-padding" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, fontFamily: 'var(--font-display)', margin: 0 }}>
              Students Requiring Support ({insights.high_attention_students?.length || 0})
            </h3>

            {!insights.high_attention_students || insights.high_attention_students.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: 'hsl(var(--color-text-3))', margin: 0 }}>
                All enrolled students are currently progressing independently.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'hsl(var(--color-surface-2))', borderBottom: '1px solid hsl(var(--color-border))' }}>
                      <th style={{ padding: 'var(--sp-3) var(--sp-4)', fontWeight: 600 }}>Student Name</th>
                      <th style={{ padding: 'var(--sp-3) var(--sp-4)', fontWeight: 600 }}>Student ID</th>
                      <th style={{ padding: 'var(--sp-3) var(--sp-4)', fontWeight: 600 }}>Current Status</th>
                      <th style={{ padding: 'var(--sp-3) var(--sp-4)', fontWeight: 600 }}>Priority</th>
                      <th style={{ padding: 'var(--sp-3) var(--sp-4)', fontWeight: 600 }}>Topics</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.high_attention_students.map((s) => {
                      const levelInfo = LEVEL_BADGES[s.level] || LEVEL_BADGES[3]
                      return (
                        <tr key={s.student_id} style={{ borderBottom: '1px solid hsl(var(--color-border))' }}>
                          <td style={{ padding: 'var(--sp-3) var(--sp-4)', fontWeight: 600 }}>{s.name}</td>
                          <td style={{ padding: 'var(--sp-3) var(--sp-4)', color: 'hsl(var(--color-text-3))' }}>#{s.student_id}</td>
                          <td style={{ padding: 'var(--sp-3) var(--sp-4)' }}>
                            <span className={`badge ${levelInfo.badgeClass}`}>
                              {levelInfo.label}
                            </span>
                          </td>
                          <td style={{ padding: 'var(--sp-3) var(--sp-4)' }}>
                            <span className={`badge ${s.attention_priority === 'high' ? 'badge-amber' : 'badge-neutral'}`}>
                              {s.attention_priority}
                            </span>
                          </td>
                          <td style={{ padding: 'var(--sp-3) var(--sp-4)', color: 'hsl(var(--color-text-2))' }}>
                            {s.topics?.join(', ') || 'N/A'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  )
}

export default TeacherInsights
