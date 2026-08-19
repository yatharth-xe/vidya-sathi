import React from 'react'

const RiskStudentTable = () => {
  // Mock list of at-risk students
  const mockStudents = [
    { id: 1, name: "Aarav Sharma", score: "42.0%", riskReason: "Missing 2 assignments", riskLevel: "high" },
    { id: 2, name: "Divya Patel", score: "58.5%", riskReason: "Failed recent Quadratic quiz", riskLevel: "medium" },
    { id: 3, name: "Rohan Das", score: "55.0%", riskReason: "Consistently low quiz scores", riskLevel: "medium" }
  ]

  const getBadgeStyle = (level) => {
    return level === 'high'
      ? { background: 'rgba(239, 68, 68, 0.1)', color: 'hsl(350, 89%, 60%)' }
      : { background: 'rgba(245, 158, 11, 0.1)', color: 'hsl(38, 92%, 50%)' }
  }

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', overflow: 'hidden' }}>
      <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Students Requiring Attention</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid hsl(var(--border-color))' }}>
            <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase' }}>Student Name</th>
            <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase' }}>Average Score</th>
            <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase' }}>Risk Reason</th>
            <th style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', textAlign: 'right' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {mockStudents.map((student) => (
            <tr key={student.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
              <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>{student.name}</td>
              <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.9rem' }}>{student.score}</td>
              <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.85rem' }}>
                <span style={{
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '12px',
                  marginRight: '0.5rem',
                  ...getBadgeStyle(student.riskLevel)
                }}>
                  {student.riskLevel}
                </span>
                <span style={{ color: 'hsl(var(--text-secondary))' }}>{student.riskReason}</span>
              </td>
              <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                <button className="btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', background: 'transparent', border: '1px solid hsl(var(--border-color))', color: 'hsl(var(--text-primary))' }}>
                  Contact Student
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default RiskStudentTable
