/**
 * Teacher Dashboard — lists classrooms with create form.
 * Uses AppShell for consistent layout.
 * API + auth logic unchanged.
 */
import React, { useState, useEffect } from 'react'
import AppShell from '../../components/common/AppShell'
import Sidebar from '../../components/common/Sidebar'
import PageHeader from '../../components/common/PageHeader'
import ClassroomCard from '../../components/teacher/ClassroomCard'
import Loader from '../../components/common/Loader'
import EmptyState from '../../components/common/EmptyState'
import teacherService from '../../services/teacherService'
import useAuth from '../../hooks/useAuth'

const Dashboard = () => {
  const { user } = useAuth()
  const [classrooms, setClassrooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

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

  useEffect(() => { fetchClassrooms() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    setError('')
    try {
      await teacherService.createClassroom(name, description)
      setName('')
      setDescription('')
      setShowForm(false)
      fetchClassrooms()
    } catch {
      setError('Could not create classroom. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const sidebar = <Sidebar classrooms={classrooms} />

  return (
    <AppShell sidebar={sidebar}>
      <PageHeader
        breadcrumb="Dashboard"
        title={`Welcome back, ${user?.name?.split(' ')[0] ?? 'Teacher'}`}
        description="Manage your classrooms, publish assignments, and view AI-generated student insights."
        action={
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(v => !v)}
            aria-expanded={showForm}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New classroom
          </button>
        }
      />

      {/* Create classroom form — collapsible */}
      {showForm && (
        <div
          className="card card-padding"
          style={{ marginBottom: 'var(--sp-6)', maxWidth: 520 }}
        >
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1rem',
            fontWeight: 600,
            marginBottom: 'var(--sp-5)',
          }}>
            Create a new classroom
          </h2>

          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            {error && (
              <div className="alert alert-danger" role="alert">{error}</div>
            )}

            <div className="form-field">
              <label htmlFor="class-name" className="form-label">Classroom name <span aria-hidden="true" style={{ color: 'hsl(var(--color-danger))' }}>*</span></label>
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
              <label htmlFor="class-desc" className="form-label">Description <span style={{ color: 'hsl(var(--color-text-3))', fontWeight: 400 }}>(optional)</span></label>
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
                onClick={() => { setShowForm(false); setError('') }}
                disabled={creating}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={creating || !name.trim()}
              >
                {creating ? (
                  <>
                    <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} aria-hidden="true" />
                    Creating…
                  </>
                ) : 'Create classroom'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Classrooms grid */}
      {loading ? (
        <Loader message="Loading your classrooms…" />
      ) : classrooms.length === 0 ? (
        <EmptyState
          icon="🏫"
          title="No classrooms yet"
          description="Create your first classroom to start adding students and publishing assignments."
          action={
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              Create your first classroom
            </button>
          }
        />
      ) : (
        <>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--sp-4)',
          }}>
            <span style={{ fontSize: '0.875rem', color: 'hsl(var(--color-text-3))' }}>
              {classrooms.length} {classrooms.length === 1 ? 'classroom' : 'classrooms'}
            </span>
          </div>
          <div className="grid-cards">
            {classrooms.map((c) => (
              <ClassroomCard key={c.id} classroom={c} />
            ))}
          </div>
        </>
      )}
    </AppShell>
  )
}

export default Dashboard
