import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Navbar from '../../components/common/Navbar'
import Sidebar from '../../components/common/Sidebar'
import AssignmentCard from '../../components/teacher/AssignmentCard'
import AnalyticsCard from '../../components/teacher/AnalyticsCard'
import WeakTopicTable from '../../components/teacher/WeakTopicTable'
import DifficultQuestionTable from '../../components/teacher/DifficultQuestionTable'
import RiskStudentTable from '../../components/teacher/RiskStudentTable'
import Loader from '../../components/common/Loader'
import teacherService from '../../services/teacherService'

const Classroom = () => {
  const { classId } = useParams()
  const [classroom, setClassroom] = useState(null)
  const [classrooms, setClassrooms] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Assignment publisher form
  const [assignTitle, setAssignTitle] = useState('')
  const [assignDesc, setAssignDesc] = useState('')
  const [publishing, setPublishing] = useState(false)

  // AI-generated insight
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

  useEffect(() => {
    fetchData()
  }, [classId])

  const fetchAIInsights = async () => {
    setLoadingInsights(true)
    try {
      const response = await fetch(`/api/v1/teacher/insights/${classId}`)
      const data = await response.json()
      setInsights(data.insights)
    } catch (err) {
      setInsights('Unable to load AI Insights.')
    } finally {
      setLoadingInsights(false)
    }
  }

  const handlePublishAssignment = async (e) => {
    e.preventDefault()
    if (!assignTitle.trim()) return

    setPublishing(true)
    try {
      await teacherService.createAssignment(assignTitle, assignDesc, parseInt(classId))
      setAssignTitle('')
      setAssignDesc('')
      fetchData()
    } catch (err) {
      alert('Failed to publish assignment.')
    } finally {
      setPublishing(false)
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar classrooms={classrooms} />
        <main className="main-content" style={{ display: 'flex', gap: '2rem' }}>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h1 style={{ fontSize: '2rem' }}>{classroom?.name} Dashboard</h1>
              <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.95rem', marginTop: '0.25rem' }}>
                {classroom?.description || 'Classroom details and student overview.'}
              </p>
            </div>

            {/* Performance metrics row */}
            {analytics && <AnalyticsCard analytics={analytics} />}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {/* Weak concepts */}
              {analytics && <WeakTopicTable topics={analytics.common_weak_topics} />}
              
              {/* Difficult quiz questions */}
              <DifficultQuestionTable />
            </div>

            {/* Risk Students List */}
            <RiskStudentTable />

            {/* Assignments published */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem' }}>Assignments Published</h3>
              {classroom?.assignments?.length === 0 ? (
                <p style={{ color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>No assignments yet.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                  {classroom?.assignments?.map(assign => (
                    <AssignmentCard key={assign.id} assignment={assign} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Teacher control column */}
          <div style={{ width: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* AI Insights generator */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>AI Classroom Assistant</h3>
              <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', marginBottom: '1.25rem' }}>
                Generate classroom performance analysis and intervention suggestions using Gemini.
              </p>
              <button onClick={fetchAIInsights} disabled={loadingInsights} className="btn-primary" style={{ width: '100%', marginBottom: '1rem' }}>
                {loadingInsights ? 'Analyzing...' : 'Generate Insights'}
              </button>
              {insights && (
                <div style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid hsl(var(--border-color))',
                  fontSize: '0.85rem',
                  lineHeight: '1.5',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {insights}
                </div>
              )}
            </div>

            {/* Create Assignment Form */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Publish Assignment</h3>
              <form onSubmit={handlePublishAssignment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>Assignment Title</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Chapter 2 Quiz"
                    value={assignTitle}
                    onChange={(e) => setAssignTitle(e.target.value)}
                    required
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>Instructions</label>
                  <textarea
                    className="input-field"
                    placeholder="Read Chapter 2 PDF, then complete the quiz..."
                    value={assignDesc}
                    onChange={(e) => setAssignDesc(e.target.value)}
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem', minHeight: '80px', resize: 'vertical' }}
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={publishing}>
                  {publishing ? 'Publishing...' : 'Publish'}
                </button>
              </form>
            </div>

          </div>

        </main>
      </div>
    </div>
  )
}

export default Classroom
