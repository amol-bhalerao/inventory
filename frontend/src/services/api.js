import axios from 'axios'
import { useAuthStore } from '../context/authStore'

// Determine API base URL. During development, prefer localhost backend
// but allow explicit VITE_API_URL to override (useful when hitting remote dev server).
// Determine API base URL. When running on localhost, always use local backend.
// Otherwise use the environment variable or production fallback.
const API_BASE_URL = (() => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:5000/api';
    }
  }
  // For production or other hosts, use env var or fallback
  return import.meta.env.VITE_API_URL || 'https://shop.hisofttechnology.com/api';
})();

const apiClient = axios.create({
  baseURL: API_BASE_URL
  // Don't set default Content-Type - let axios handle it based on request type
})

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // For FormData requests, don't set Content-Type header - let the browser set it
  if (!(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json'
  }

  return config
}, (error) => {
  return Promise.reject(error)
})

// Handle responses
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error.response?.data || error.message)
  }
)

export default apiClient
