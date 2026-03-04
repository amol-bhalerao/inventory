import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../context/authStore'

export default function PrivateRoute() {
  const { user, token } = useAuthStore()

  if (!token || !user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
