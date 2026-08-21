/**
 * Agent service — frontend calls to the AI agent endpoints.
 *
 * Endpoints consumed:
 *   POST /api/v1/agents/student/chat                       → student doubt chat
 *   GET  /api/v1/agents/teacher/insights/{classroom_id}    → teacher insights (GET)
 *   POST /api/v1/agents/teacher/insights/{classroom_id}    → teacher insights (POST, with assignment filter)
 *
 * Auth: both endpoints require the appropriate JWT (student / teacher).
 *       The JWT is attached automatically by api.js.
 */
import api from './api'

const agentService = {
  /**
   * Send a student doubt/message to the Student Agent.
   * Accepts object { assignmentId, questionId, message }.
   * Note: student_id is derived from JWT header by the backend.
   */
  sendStudentDoubt: async ({ assignmentId, questionId, message }) => {
    const payload = {
      assignment_id: parseInt(assignmentId, 10),
      message,
    }

    if (questionId && !isNaN(parseInt(questionId, 10))) {
      payload.question_id = parseInt(questionId, 10)
    }

    const response = await api.post('/api/v1/agents/student/chat', payload)
    return response.data
  },

  /**
   * Positional argument variant of sendStudentDoubt.
   */
  studentChat: async (assignmentId, questionId, message) => {
    return agentService.sendStudentDoubt({ assignmentId, questionId, message })
  },

  /**
   * Get AI-generated classroom insights for a teacher.
   * Uses GET variant (no assignment filter).
   *
   * @param {number} classroomId
   * @returns {Promise<TeacherInsightsResponse>}
   */
  getTeacherInsights: async (classroomId) => {
    const response = await api.get(
      `/api/v1/agents/teacher/insights/${classroomId}`
    )
    return response.data
  },

  /**
   * Get AI insights filtered to a specific assignment.
   * Uses POST variant.
   *
   * @param {number} classroomId
   * @param {number} assignmentId
   * @returns {Promise<TeacherInsightsResponse>}
   */
  getTeacherInsightsByAssignment: async (classroomId, assignmentId) => {
    const response = await api.post(
      `/api/v1/agents/teacher/insights/${classroomId}`,
      { assignment_id: assignmentId }
    )
    return response.data
  },
}

export default agentService
