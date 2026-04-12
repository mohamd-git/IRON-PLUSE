import api from './client'
import type { AuthTokens } from '../types/user'

export const authApi = {
  register: (data: { email: string; username: string; display_name: string; password: string }) =>
    api.post<AuthTokens>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<AuthTokens>('/auth/login', data),

  refresh: (refresh_token: string) =>
    api.post<AuthTokens>('/auth/refresh', { refresh_token }),

  logout: (refresh_token: string) =>
    api.post('/auth/logout', { refresh_token }),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (data: { email: string; code: string; new_password: string }) =>
    api.post('/auth/reset-password', data),

  googleAuth: (google_token: string) =>
    api.post<AuthTokens>('/auth/google', { google_token }),
}
