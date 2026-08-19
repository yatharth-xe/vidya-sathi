import api from './api'

const authService = {
  login: async (email, password) => {
    const params = new URLSearchParams()
    params.append('username', email)
    params.append('password', password)
    
    const response = await api.post('/api/v1/auth/login', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
    return response.data
  },

  register: async (email, name, password, role) => {
    const response = await api.post('/api/v1/auth/register', {
      email,
      name,
      password,
      role
    })
    return response.data
  }
}

export default authService
