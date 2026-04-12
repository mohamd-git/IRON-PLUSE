import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import api from '../api/client'
import type { User } from '../types/user'

export function useAuth() {
  const { user, isAuthenticated, isLoading, setUser, setTokens, logout, initialize } = useAuthStore()

  useEffect(() => { initialize() }, [initialize])

  const { data } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<User>('/users/me').then((r) => r.data),
    enabled: isAuthenticated && !user,
  })

  useEffect(() => {
    if (data) setUser(data)
  }, [data, setUser])

  return { user, isAuthenticated, isLoading, setUser, setTokens, logout }
}
