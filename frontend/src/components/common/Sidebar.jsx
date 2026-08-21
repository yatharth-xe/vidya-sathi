/**
 * Sidebar — role-aware navigation sidebar.
 * Receives `classrooms` array from parent pages for classroom list.
 * Uses role from AuthContext to show correct nav items.
 */
import React from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'
import { getInitials } from '../../utils/helpers'

/* ── Inline SVG icons (no dependency) ────────────────────────── */
const Icon = ({ path, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
    className="nav-icon" aria-hidden="true">
    <path d={path} />
  </svg>
)

const ICONS = {
  dashboard:  'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10',
  classrooms: 'M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z',
  assignments:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2 M9 5a2 2 0 002 2h2a2 2 0 002-2 M9 5a2 2 0 012-2h2a2 2 0 012 2 M9 12h6 M9 16h4',
  progress:   'M18 20V10 M12 20V4 M6 20v-6',
  ai:         'M12 2a10 10 0 100 20A10 10 0 0012 2z M12 8v4l3 3',
  insights:   'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75',
  notify:     'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 01-3.46 0',
  logout:     'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9',
}

const TEACHER_NAV = [
  { label: 'Dashboard',       icon: 'dashboard',   path: '/teacher' },
  { label: 'Classrooms',      icon: 'classrooms',  path: '/teacher' },
  { label: 'Assignments',     icon: 'assignments', path: '/teacher' },
  { label: 'Student Insights',icon: 'insights',    path: '/teacher/insights' },
  { label: 'Notifications',   icon: 'notify',      path: '/teacher/notifications' },
]

const STUDENT_NAV = [
  { label: 'Dashboard',    icon: 'dashboard',   path: '/student' },
  { label: 'My Classrooms',icon: 'classrooms',  path: '/student' },
  { label: 'Assignments',  icon: 'assignments', path: null },
  { label: 'Progress',     icon: 'progress',    path: null },
  { label: 'AI Tutor',     icon: 'ai',          path: null },
]

const Sidebar = ({ classrooms = [] }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { classId } = useParams()

  const isTeacher = user?.role === 'teacher'
  const baseRoute = isTeacher ? '/teacher' : '/student'
  const navItems = isTeacher ? TEACHER_NAV : STUDENT_NAV
  const activeClassId = classId ? parseInt(classId) : null

  // A nav item is active if the route matches exactly or is a prefix
  const isNavActive = (item) => {
    if (!item.path) return false
    if (item.path === baseRoute) {
      return location.pathname === baseRoute
    }
    return location.pathname.startsWith(item.path)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: 'var(--sp-4) var(--sp-3)',
        gap: 'var(--sp-1)',
        overflowY: 'auto',
      }}
    >
      {/* Main nav */}
      <nav aria-label="Main navigation" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItems.map((item) => {
          const active = isNavActive(item)
          const isClickable = !!item.path

          return (
            <button
              key={item.label}
              className={`nav-item${active ? ' active' : ''}`}
              onClick={() => item.path && navigate(item.path)}
              aria-current={active ? 'page' : undefined}
              style={!isClickable ? { opacity: 0.45, cursor: 'default' } : {}}
              title={!isClickable ? `${item.label} — coming soon` : undefined}
            >
              <Icon path={ICONS[item.icon]} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Classroom list */}
      {classrooms.length > 0 && (
        <>
          <hr className="divider" style={{ margin: 'var(--sp-3) 0 var(--sp-2)' }} />
          <span className="nav-section-label">
            {isTeacher ? 'My Classrooms' : 'Enrolled'}
          </span>
          <nav
            aria-label="Classrooms"
            style={{ display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', flex: 1 }}
          >
            {classrooms.map((c) => {
              const active = activeClassId === c.id
              return (
                <button
                  key={c.id}
                  className={`nav-item${active ? ' active' : ''}`}
                  onClick={() => navigate(`${baseRoute}/classroom/${c.id}`)}
                  aria-current={active ? 'page' : undefined}
                  title={c.name}
                >
                  {/* Small colored dot as classroom indicator */}
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: active ? 'hsl(var(--color-primary))' : 'hsl(var(--color-border))',
                    flexShrink: 0,
                    transition: 'background var(--transition)',
                  }} aria-hidden="true" />
                  <span className="truncate" style={{ flex: 1, textAlign: 'left' }}>
                    {c.name}
                  </span>
                </button>
              )
            })}
          </nav>
        </>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* User footer */}
      <div style={{
        borderTop: '1px solid hsl(var(--color-border))',
        paddingTop: 'var(--sp-3)',
        marginTop: 'var(--sp-2)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--sp-2)',
      }}>
        {/* User info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', padding: '0 var(--sp-2)' }}>
          <div
            className={`avatar avatar-sm ${isTeacher ? 'avatar-amber' : 'avatar-primary'}`}
            aria-hidden="true"
          >
            {getInitials(user?.name)}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'hsl(var(--color-text))',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {user?.name}
            </div>
            <div style={{
              fontSize: '0.6875rem',
              color: 'hsl(var(--color-text-3))',
              textTransform: 'capitalize',
            }}>
              {user?.role}
            </div>
          </div>
        </div>

        {/* Logout button */}
        <button
          className="nav-item"
          onClick={logout}
          style={{ color: 'hsl(var(--color-danger-fg) / 0.85)' }}
          aria-label="Sign out of Vidya Sathi"
        >
          <Icon path={ICONS.logout} />
          Sign out
        </button>
      </div>
    </div>
  )
}

export default Sidebar
