import React, { useState, useEffect } from 'react'
import Navbar from '../../components/common/Navbar'
import Sidebar from '../../components/common/Sidebar'
import ClassroomCard from '../../components/teacher/ClassroomCard'
import Loader from '../../components/common/Loader'
import teacherService from '../../services/teacherService'

const Dashboard = () => {
  const [classrooms, setClassrooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const fetchClassrooms = async () => {
    try {
      const data = await teacherService.getClassrooms()
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

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return

    setCreating(true)
    setError('')
    try {
      await teacherService.createClassroom(name, description)
      setName('')
      setDescription('')
      fetchClassrooms()
    } catch (err) {
      setError('Could not create classroom.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar classrooms={classrooms} />
        <main className="main-content" style={{ display: 'flex', gap: '2rem' }}>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h1 style={{ fontSize: '2rem' }}>Teacher Dashboard</h1>
              <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.95rem' }}>
                Monitor classrooms, assign study works, and check AI-generated student insights.
              </p>
            </div>

            {loading ? (
              <Loader />
            ) : classrooms.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎓</div>
                <h3>Welcome Teacher</h3>
                <p style={{ color: 'hsl(var(--text-secondary))', marginTop: '0.5rem' }}>
                  Create your first virtual classroom on the right to start teaching.
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
          </div>

          {/* Quick Create Sidebar Panel */}
          <div style={{ width: '320px', flexShrink: 0 }}>
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>Create Classroom</h3>
              
              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {error && (
                  <span style={{ fontSize: '0.8rem', color: 'hsl(350, 89%, 60%)' }}>
                    {error}
                  </span>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>Class Name</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Mathematics Class X"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>Description</label>
                  <textarea
                    className="input-field"
                    placeholder="Brief details about schedule, modules..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem', minHeight: '80px', resize: 'vertical' }}
                  />
                </div>

                <button type="submit" className="btn-primary" disabled={creating} style={{ marginTop: '0.5rem' }}>
                  {creating ? 'Creating...' : 'Create Class'}
                </button>
              </form>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}

export default Dashboard
