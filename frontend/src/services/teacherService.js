import api from './api'

const teacherService = {
  createClassroom: async (name, description) => {
    const response = await api.post('/api/v1/classrooms/', { name, description })
    return response.data
  },

  getClassrooms: async () => {
    const response = await api.get('/api/v1/classrooms/')
    return response.data
  },

  createAssignment: async (title, description, classroomId, dueDate = null) => {
    const response = await api.post('/api/v1/assignments/', {
      title,
      description,
      classroom_id: classroomId,
      due_date: dueDate
    })
    return response.data
  },

  uploadAssignmentPDF: async (assignmentId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await api.post(`/api/v1/assignments/${assignmentId}/upload-pdf`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  },

  getClassroomAnalytics: async (classroomId) => {
    const response = await api.get(`/api/v1/teacher/analytics/${classroomId}`)
    return response.data
  }
}

export default teacherService
