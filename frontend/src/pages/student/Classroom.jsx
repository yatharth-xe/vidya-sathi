import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Navbar from '../../components/common/Navbar'
import Sidebar from '../../components/common/Sidebar'
import AssignmentCard from '../../components/student/AssignmentCard'
import ProgressCard from '../../components/student/ProgressCard'
import DoubtChat from '../../components/student/DoubtChat'
import Loader from '../../components/common/Loader'
import studentService from '../../services/studentService'

const Classroom = () => {
  const { classId } = useParams()
  const [classroom, setClassroom] = useState(null)
  const [classrooms, setClassrooms] = useState([])
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('assignments') // 'assignments' or 'doubt-chat'

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const list = await studentService.getClassrooms()
        setClassrooms(list)
        
        const details = list.find(c => c.id === parseInt(classId))
        setClassroom(details)

        const prog = await studentService.getProgress(parseInt(classId))
        setProgress(prog)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [classId])

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

  if (!classroom) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <div style={{ display: 'flex', flex: 1 }}>
          <Sidebar classrooms={classrooms} />
          <main className="main-content">
            <h3>Classroom not found</h3>
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
              <h1 style={{ fontSize: '2rem' }}>{classroom.name}</h1>
              <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.95rem', marginTop: '0.25rem' }}>
                {classroom.description || 'No description provided.'}
              </p>
            </div>

            {/* Tab navigation */}
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '0.5rem' }}>
              <span
                onClick={() => setActiveTab('assignments')}
                style={{
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: '0.5rem 1rem',
                  borderBottom: activeTab === 'assignments' ? '2px solid hsl(var(--accent-primary))' : '2px solid transparent',
                  color: activeTab === 'assignments' ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))'
                }}
              >
                Assignments
              </span>
              <span
                onClick={() => setActiveTab('doubt-chat')}
                style={{
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: '0.5rem 1rem',
                  borderBottom: activeTab === 'doubt-chat' ? '2px solid hsl(var(--accent-primary))' : '2px solid transparent',
                  color: activeTab === 'doubt-chat' ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))'
                }}
              >
                AI Doubt Chat
              </span>
            </div>

            {/* Tab contents */}
            {activeTab === 'assignments' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {classroom.assignments?.length === 0 ? (
                  <p style={{ color: 'hsl(var(--text-muted))', fontStyle: 'italic', padding: '1rem' }}>
                    No assignments published yet.
                  </p>
                ) : (
                  classroom.assignments?.map(assign => (
                    <AssignmentCard key={assign.id} assignment={assign} />
                  ))
                )}
              </div>
            ) : (
              <DoubtChat />
            )}
          </div>

          {/* Right Sidebar stats card */}
          {progress && (
            <div style={{ width: '320px', flexShrink: 0 }}>
              <ProgressCard progress={progress} />
            </div>
          )}

        </main>
      </div>
    </div>
  )
}

export default Classroom
