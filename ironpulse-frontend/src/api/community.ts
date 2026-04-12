import api from './client'
import type { Post, Comment, BattleChallenge, Message, Conversation, Notification, PartnerCandidate } from '../types/community'

export const communityApi = {
  // Posts
  getFeed: (cursor?: string) =>
    api.get<{ posts: Post[]; next_cursor: string | null }>('/posts', { params: { cursor } }),
  createPost: (data: { content: string; post_type?: string; media_urls?: string[] }) =>
    api.post<Post>('/posts', data),
  deletePost: (id: string) => api.delete(`/posts/${id}`),
  toggleLike: (id: string) => api.post<{ action: string; likes_count: number }>(`/posts/${id}/like`),
  getComments: (postId: string, params?: { skip?: number; limit?: number }) =>
    api.get<Comment[]>(`/posts/${postId}/comments`, { params }),
  createComment: (postId: string, content: string) =>
    api.post<Comment>(`/posts/${postId}/comments`, { content }),

  // Challenges
  createChallenge: (data: { challenged_id: string; exercise_id: string; target_weight_kg?: number; target_reps?: number }) =>
    api.post<BattleChallenge>('/challenges', data),
  getChallenges: () => api.get<BattleChallenge[]>('/challenges'),
  acceptChallenge: (id: string) => api.post<BattleChallenge>(`/challenges/${id}/accept`),
  declineChallenge: (id: string) => api.post<BattleChallenge>(`/challenges/${id}/decline`),

  // Messages
  getConversations: () => api.get<Conversation[]>('/messages/conversations'),
  getMessages: (userId: string, params?: { skip?: number; limit?: number }) =>
    api.get<Message[]>(`/messages/${userId}`, { params }),
  sendMessage: (userId: string, data: { content: string; message_type?: string }) =>
    api.post<Message>(`/messages/${userId}`, data),

  // Signals
  getSignals: (params?: { type?: string; skip?: number; limit?: number }) =>
    api.get<{ notifications: Notification[]; unread_count: number }>('/signals', { params }),
  markRead: (id: string) => api.post(`/signals/${id}/read`),
  markAllRead: () => api.post('/signals/read-all'),
  getUnreadCount: () => api.get<{ count: number }>('/signals/unread-count'),

  // Partners
  discoverPartners: () => api.get<PartnerCandidate[]>('/partners/discover'),
  connectPartner: (userId: string, data?: { content?: string }) =>
    api.post(`/partners/${userId}/connect`, data),
}
