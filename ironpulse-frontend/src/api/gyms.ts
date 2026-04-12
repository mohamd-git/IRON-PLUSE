import api from './client'
import type { Gym } from '../types/payment'

export const gymsApi = {
  getGyms: (params?: Record<string, string | boolean | number>) =>
    api.get<Gym[]>('/gyms', { params }),
  getGym: (id: string) => api.get<Gym>(`/gyms/${id}`),
  getNearby: (lat: number, lng: number, radius_km?: number) =>
    api.get<Gym[]>('/gyms/nearby', { params: { lat, lng, radius_km } }),
  checkin: (gymId: string) => api.post(`/gyms/${gymId}/checkin`),

  // Physique
  uploadPhoto: (formData: FormData) =>
    api.post('/physique/photos', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getPhotos: () => api.get('/physique/photos'),
  createMeasurement: (data: Record<string, number | null>) =>
    api.post('/physique/measurements', data),
  getMeasurements: () => api.get('/physique/measurements'),
  getProgress: () => api.get('/physique/progress'),
}
