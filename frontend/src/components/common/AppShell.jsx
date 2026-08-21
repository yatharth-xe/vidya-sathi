/**
 * AppShell — shared layout wrapper for authenticated pages.
 * Composes TopNav + Sidebar + main content area.
 * Usage: <AppShell sidebar={<Sidebar />}>{children}</AppShell>
 */
import React, { useState } from 'react'
import TopNav from './TopNav'

const AppShell = ({ children, sidebar }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const closeSidebar = () => setSidebarOpen(false)
  const toggleSidebar = () => setSidebarOpen(o => !o)

  return (
    <div className="app-shell">
      <TopNav onToggleSidebar={toggleSidebar} />

      <div className="app-body">
        {/* Sidebar — always visible on desktop, drawer on mobile */}
        <nav
          className={`app-sidebar${sidebarOpen ? ' mobile-open' : ''}`}
          aria-label="Primary navigation"
        >
          {sidebar}
        </nav>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            aria-hidden="true"
            onClick={closeSidebar}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 199,
              backdropFilter: 'blur(2px)',
            }}
          />
        )}

        <main className="app-main" id="main-content">
          <div className="content-container">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default AppShell
