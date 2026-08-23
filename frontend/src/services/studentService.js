/**
 * Student service — all API calls a student user makes.
 *
 * Endpoints consumed (all require Student JWT):
 *   GET  /api/v1/classrooms/                          → list enrolled classrooms
 *   POST /api/v1/classrooms/{id}/enroll               → self-enroll
 *   GET  /api/v1/student/assignments                  → list assignments
 *   GET  /api/v1/student/assignments/{id}             → assignment detail
 *   GET  /api/v1/student/assignments/{id}/file        → download PDF
 *   GET  /api/v1/student/progress/{assignment_id}     → question progress
 */
import api from './api'

const studentService = {
  // ── Classrooms ────────────────────────────────────────────────────────
  getClassrooms: async () => {
    const response = await api.get('/api/v1/classrooms/')
    return response.data
  },

  /** Get details of a single enrolled classroom. */
  getClassroom: async (classroomId) => {
    const response = await api.get(`/api/v1/classrooms/${classroomId}`)
    return response.data
  },

  enrollInClassroom: async (classroomId) => {
    const response = await api.post(`/api/v1/classrooms/${classroomId}/enroll`)
    return response.data
  },

  // ── Assignments ───────────────────────────────────────────────────────
  /** List all assignments for the student's enrolled classrooms. */
  getAssignments: async () => {
    const response = await api.get('/api/v1/student/assignments')
    return response.data
  },

  /** Get details of a single assignment (includes questions array). */
  getAssignment: async (assignmentId) => {
    const response = await api.get(`/api/v1/student/assignments/${assignmentId}`)
    return response.data
  },

  /**
   * Get assignment PDF as a blob object URL (uses JWT auth header).
   * Caller must revoke URL using URL.revokeObjectURL(url) on unmount/cleanup.
   */
  getAssignmentFileBlob: async (assignmentId) => {
    const response = await api.get(
      `/api/v1/student/assignments/${assignmentId}/file`,
      { responseType: 'blob' }
    )
    return URL.createObjectURL(response.data)
  },

  /**
   * Get the PDF download URL for an assignment.
   */
  getAssignmentFileUrl: (assignmentId) => {
    const base = import.meta.env.VITE_API_BASE_URL || ''
    return `${base}/api/v1/student/assignments/${assignmentId}/file`
  },

  /**
   * Download the assignment PDF as a blob and trigger browser download.
   */
  downloadAssignmentPDF: async (assignmentId) => {
    const response = await api.get(
      `/api/v1/student/assignments/${assignmentId}/file`,
      { responseType: 'blob' }
    )
    const url = URL.createObjectURL(response.data)
    const a = document.createElement('a')
    a.href = url
    a.download = `assignment_${assignmentId}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    return url
  },

  // ── Progress ──────────────────────────────────────────────────────────
  /** Get the authenticated student's progress for all questions in an assignment. */
  getProgress: async (assignmentId) => {
    const response = await api.get(`/api/v1/student/progress/${assignmentId}`)
    return response.data
  },

  // ── Practice Quiz (Level 3) ───────────────────────────────────────────
  /** Start a Level 3 practice quiz for a topic. */
  startPracticeQuiz: async ({ assignmentId, questionId, topic }) => {
    const response = await api.post('/api/v1/student/quiz/start', {
      assignment_id: parseInt(assignmentId),
      question_id: questionId ? parseInt(questionId) : undefined,
      topic: topic || undefined,
    })
    return response.data
  },

  /** Submit practice quiz answers for backend evaluation. */
  submitPracticeQuiz: async ({ quizId, assignmentId, questionId, topic, answers }) => {
    const response = await api.post('/api/v1/student/quiz/submit', {
      quiz_id: parseInt(quizId),
      assignment_id: parseInt(assignmentId),
      question_id: questionId ? parseInt(questionId) : undefined,
      topic: topic || undefined,
      answers: answers.map((a) => ({
        question_id: parseInt(a.question_id),
        selected_option: a.selected_option,
      })),
    })
    return response.data
  },
}

export default studentService


