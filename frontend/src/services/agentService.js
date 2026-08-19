import api from './api'

const agentService = {
  askAgent: async (classroomId, message) => {
    const response = await api.post(`/api/v1/agents/classroom/${classroomId}/ask`, { message })
    return response.data
  },

  getInsights: async (classroomId) => {
    const response = await api.get(`/api/v1/teacher/insights/${classroomId}`)
    return response.data
  }
}

export default agentService
