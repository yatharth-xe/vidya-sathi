import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/common/ProtectedRoute'

// Pages Lazy/Direct imports
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import StudentDashboard from './pages/student/Dashboard'
import StudentClassroom from './pages/student/Classroom'
import StudentAssignment from './pages/student/Assignment'
import StudentPracticeQuiz from './pages/student/PracticeQuiz'
import TeacherDashboard from './pages/teacher/Dashboard'
import TeacherClassroom from './pages/teacher/Classroom'
import TeacherAssignment from './pages/teacher/Assignment'
import TeacherNotifications from './pages/teacher/Notifications'
import TeacherInsights from './pages/teacher/TeacherInsights'

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Student Protected Routes */}
          <Route path="/student" element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          } />
          <Route path="/student/classroom/:classId" element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentClassroom />
            </ProtectedRoute>
          } />
          <Route path="/student/classroom/:classId/assignment/:assignId" element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentAssignment />
            </ProtectedRoute>
          } />
          <Route path="/student/assignment/:assignmentId" element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentAssignment />
            </ProtectedRoute>
          } />
          <Route path="/student/practice/:quizId" element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentPracticeQuiz />
            </ProtectedRoute>
          } />

          {/* Teacher Protected Routes */}
          <Route path="/teacher" element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherDashboard />
            </ProtectedRoute>
          } />
          <Route path="/teacher/classroom/:classId" element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherClassroom />
            </ProtectedRoute>
          } />
          <Route path="/teacher/classroom/:classId/assignment/:assignId" element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherAssignment />
            </ProtectedRoute>
          } />
          <Route path="/teacher/assignment/:assignmentId" element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherAssignment />
            </ProtectedRoute>
          } />
          <Route path="/teacher/notifications" element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherNotifications />
            </ProtectedRoute>
          } />
          <Route path="/teacher/insights" element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherInsights />
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
