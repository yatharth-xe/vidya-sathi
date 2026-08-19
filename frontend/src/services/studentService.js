import api from './api'

const studentService = {
  getClassrooms: async () => {
    const response = await api.get('/api/v1/classrooms')
    return response.data
  },

  enrollInClassroom: async (classroomId) => {
    const response = await api.post(`/api/v1/classrooms/${classroomId}/enroll`)
    return response.data
  },

  getProgress: async (classroomId) => {
    const response = await api.get(`/api/v1/student/progress/${classroomId}`)
    return response.data
  },

  submitAssignment: async (assignmentId) => {
    const response = await api.post('/api/v1/assignments/submit', {
      assignment_id: assignmentId
    })
    return response.data
  }
}

export default studentService
