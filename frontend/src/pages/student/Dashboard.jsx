import React, { useState, useEffect } from 'react'
import Navbar from '../../components/common/Navbar'
import Sidebar from '../../components/common/Sidebar'
import ClassroomCard from '../../components/student/ClassroomCard'
import Loader from '../../components/common/Loader'
import studentService from '../../services/studentService'

const Dashboard = () => {
  const [classrooms, setClassrooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [enrollCode, setEnrollCode] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const [message, setMessage] = useState('')

  const fetchClassrooms = async () => {
    try {
      const data = await studentService.getClassrooms()
      setClassrooms(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClassrooms()
  }, [])

  const handleEnroll = async (e) => {
    e.preventDefault()
    if (!enrollCode.trim()) return

    setEnrolling(true)
    setMessage('')
    try {
      await studentService.enrollInClassroom(parseInt(enrollCode))
      setMessage('Successfully enrolled!')
      setEnrollCode('')
      fetchClassrooms()
    } catch (err) {
      setMessage('Enrollment failed. Please check the classroom ID.')
    } finally {
      setEnrolling(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar classrooms={classrooms} />
        <main className="main-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <h1 style={{ fontSize: '2rem' }}>Student Dashboard</h1>
              <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.95rem' }}>
                Access your virtual study desks and AI co-pilots here.
              </p>
            </div>
            
            <form onSubmit={handleEnroll} style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center',
              padding: '1rem',
              borderRadius: '12px',
              border: '1px solid hsl(var(--border-color))',
              background: 'hsl(var(--bg-secondary))'
            }}>
              <input
                type="text"
                placeholder="Classroom ID"
                className="input-field"
                value={enrollCode}
                onChange={(e) => setEnrollCode(e.target.value)}
                style={{ padding: '0.5rem 1rem', width: '140px', fontSize: '0.85rem' }}
              />
              <button type="submit" className="btn-primary" disabled={enrolling} style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
                {enrolling ? 'Enrolling...' : 'Enroll'}
              </button>
            </form>
          </div>

          {message && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid hsl(var(--border-color))',
              marginBottom: '1.5rem',
              fontSize: '0.9rem'
            }}>
              {message}
            </div>
          )}

          {loading ? (
            <Loader />
          ) : classrooms.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎓</div>
              <h3>Welcome to Vidya Sathi</h3>
              <p style={{ color: 'hsl(var(--text-secondary))', marginTop: '0.5rem' }}>
                You are not enrolled in any classrooms yet. Enter a classroom ID on the top right to get started.
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1.5rem'
            }}>
              {classrooms.map((c) => (
                <ClassroomCard key={c.id} classroom={c} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default Dashboard
