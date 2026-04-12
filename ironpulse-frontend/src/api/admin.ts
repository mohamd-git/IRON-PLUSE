import api from './client'

export const adminApi = {
  getUsers: (params?: { search?: string; role?: string; is_active?: boolean; skip?: number; limit?: number }) =>
    api.get('/admin/users', { params }),
  updateUser: (id: string, data: { role?: string; is_active?: boolean }) =>
    api.patch(`/admin/users/${id}`, data),
  getAnalytics: () => api.get('/admin/analytics'),
  getRevenue: () => api.get('/admin/revenue'),
  getActivityFeed: () => api.get('/admin/activity-feed'),
}
