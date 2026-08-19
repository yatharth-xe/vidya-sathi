import axios from 'axios'

const api = axios.create({
  baseURL: '', // Proxied via Vite config
  headers: {
    'Content-Type': 'application/json',
  },
})

// Automatically insert authorization token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

export default api
