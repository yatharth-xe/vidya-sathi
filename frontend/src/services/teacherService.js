/**
 * Teacher service — all API calls a teacher user makes.
 *
 * Endpoints consumed (all require Teacher JWT):
 *   POST /api/v1/classrooms/                              → create classroom
 *   GET  /api/v1/classrooms/                              → list own classrooms
 *   GET  /api/v1/classrooms/{id}                          → classroom detail
 *   POST /api/v1/classrooms/{id}/students/{sid}           → add student
 *   POST /api/v1/assignments/                             → create assignment
 *   GET  /api/v1/assignments/                             → list own assignments
 *   GET  /api/v1/assignments/?classroom_id={id}           → filter by classroom
 *   GET  /api/v1/assignments/{id}                         → assignment detail
 *   POST /api/v1/assignments/{id}/upload-pdf              → upload PDF
 *   POST /api/v1/assignments/{id}/questions               → add question
 *   GET  /api/v1/assignments/{id}/questions               → list questions
 *   GET  /api/v1/teacher/analytics/{id}                   → classroom analytics
 *   GET  /api/v1/teacher/notifications                    → unread notifications
 *   PATCH /api/v1/teacher/notifications/{id}/read         → mark read
 *   GET  /api/v1/agents/teacher/insights/{classroom_id}  → AI insights
 */
import api from './api'

const teacherService = {
  // ── Classrooms ────────────────────────────────────────────────────────
  createClassroom: async (name, description) => {
    const response = await api.post('/api/v1/classrooms/', { name, description })
    return response.data
  },

  getClassrooms: async () => {
    const response = await api.get('/api/v1/classrooms/')
    return response.data
  },

  getClassroom: async (classroomId) => {
    const response = await api.get(`/api/v1/classrooms/${classroomId}`)
    return response.data
  },

  addStudent: async (classroomId, studentId) => {
    const response = await api.post(
      `/api/v1/classrooms/${classroomId}/students/${studentId}`
    )
    return response.data
  },

  // ── Assignments ───────────────────────────────────────────────────────
  createAssignment: async (title, description, classroomId, dueDate = null) => {
    const response = await api.post('/api/v1/assignments/', {
      title,
      description,
      classroom_id: classroomId,
      due_date: dueDate,
    })
    return response.data
  },

  /** List all assignments owned by the teacher. */
  getAssignments: async () => {
    const response = await api.get('/api/v1/assignments/')
    return response.data
  },

  /** List assignments filtered by a specific classroom. */
  getAssignmentsByClassroom: async (classroomId) => {
    const response = await api.get('/api/v1/assignments/', {
      params: { classroom_id: classroomId },
    })
    return response.data
  },

  getAssignment: async (assignmentId) => {
    const response = await api.get(`/api/v1/assignments/${assignmentId}`)
    return response.data
  },

  /** Upload a PDF file for an assignment. `file` is a File object. */
  uploadAssignmentPDF: async (assignmentId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post(
      `/api/v1/assignments/${assignmentId}/upload-pdf`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return response.data
  },

  // ── Assignment Questions ───────────────────────────────────────────────
  /** Add a single question to an assignment. */
  createQuestion: async (assignmentId, { questionNumber, questionText, subject, topic }) => {
    const response = await api.post(`/api/v1/assignments/${assignmentId}/questions`, {
      question_number: questionNumber,
      question_text: questionText,
      subject,
      topic,
    })
    return response.data
  },

  getQuestions: async (assignmentId) => {
    const response = await api.get(`/api/v1/assignments/${assignmentId}/questions`)
    return response.data
  },

  // ── Analytics & Notifications ─────────────────────────────────────────
  getClassroomAnalytics: async (classroomId) => {
    const response = await api.get(`/api/v1/teacher/analytics/${classroomId}`)
    return response.data
  },

  getNotifications: async () => {
    const response = await api.get('/api/v1/teacher/notifications')
    return response.data
  },

  markNotificationRead: async (notificationId) => {
    const response = await api.patch(
      `/api/v1/teacher/notifications/${notificationId}/read`
    )
    return response.data
  },

  // ── Agent Insights ────────────────────────────────────────────────────
  /** Get AI-generated classroom insights from the Teacher Agent. */
  getAgentInsights: async (classroomId, assignmentId = null) => {
    const body = assignmentId ? { assignment_id: assignmentId } : {}
    const response = await api.post(
      `/api/v1/agents/teacher/insights/${classroomId}`,
      body
    )
    return response.data
  },
}

export default teacherService
