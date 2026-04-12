import api from './client'
import type { VipStatus } from '../types/payment'

export const vipApi = {
  getStatus: () => api.get<VipStatus>('/vip/status'),
  subscribe: (data: { plan: string; payment_method: string; return_url: string }) =>
    api.post('/vip/subscribe', data),
  cancel: () => api.post('/vip/cancel'),
  getLounge: () => api.get('/vip/lounge'),
  postToLounge: (content: string) => api.post('/vip/lounge', { content }),
  getContent: () => api.get('/vip/content'),

  // AI Coach
  analyzePhysique: (photo_base64: string) =>
    api.post('/ai/analyze-physique', { photo_base64 }),
  getProgramSuggestion: () => api.get('/ai/program-suggestion'),
}
