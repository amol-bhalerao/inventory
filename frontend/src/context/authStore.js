import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,

      setAuth: (user, token, refreshToken) => {
        set({ user, token, refreshToken })
        localStorage.setItem('token', token)
        localStorage.setItem('refreshToken', refreshToken)
      },

      setUser: (user) => set({ user }),

      logout: () => {
        set({ user: null, token: null, refreshToken: null })
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
      },

      isAuthenticated: () => {
        const state = useAuthStore.getState()
        return !!state.token && !!state.user
      }
    }),
    {
      name: 'auth-storage'
    }
  )
)
