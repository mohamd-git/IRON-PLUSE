import api from './client'
import type { Exercise, WorkoutSession, WorkoutTemplate, PersonalRecord, LogSetRequest, LogSetResponse } from '../types/workout'

export const workoutsApi = {
  // Exercises
  getExercises: (params?: Record<string, string | number>) =>
    api.get<Exercise[]>('/exercises', { params }),
  getExercise: (id: string) => api.get<Exercise>(`/exercises/${id}`),

  // Templates
  getTemplates: (params?: Record<string, string>) =>
    api.get<WorkoutTemplate[]>('/templates', { params }),
  getTemplate: (id: string) => api.get<WorkoutTemplate>(`/templates/${id}`),

  // Sessions
  startSession: (data: { template_id?: string; name: string }) =>
    api.post<WorkoutSession>('/sessions/start', data),
  logSet: (sessionId: string, data: LogSetRequest) =>
    api.post<LogSetResponse>(`/sessions/${sessionId}/log-set`, data),
  getSession: (id: string) => api.get<WorkoutSession>(`/sessions/${id}`),
  completeSession: (id: string) =>
    api.post<WorkoutSession>(`/sessions/${id}/complete`),
  abandonSession: (id: string) =>
    api.post<WorkoutSession>(`/sessions/${id}/abandon`),
  getHistory: (params?: { skip?: number; limit?: number }) =>
    api.get<WorkoutSession[]>('/sessions', { params }),
  getSessionSummary: (id: string) => api.get(`/sessions/${id}/summary`),

  // PRs
  getAllPRs: () => api.get<Record<string, PersonalRecord[]>>('/prs'),
  getRecentPRs: () => api.get<PersonalRecord[]>('/prs/recent'),
  getExercisePRs: (exerciseId: string) =>
    api.get(`/prs/${exerciseId}`),
}
