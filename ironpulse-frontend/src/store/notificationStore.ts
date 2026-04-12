import { create } from 'zustand'
import type { Notification } from '../types/community'
import api from '../api/client'

interface NotificationState {
  unreadCount: number
  notifications: Notification[]
  setUnreadCount: (count: number) => void
  addNotification: (n: Notification) => void
  markAllRead: () => void
  fetchInitialCount: () => Promise<void>
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadCount: 0,
  notifications: [],

  setUnreadCount: (count) => set({ unreadCount: count }),

  addNotification: (n) => set((state) => ({
    notifications: [n, ...state.notifications],
    unreadCount: state.unreadCount + 1,
  })),

  markAllRead: async () => {
    try {
      await api.post('/signals/read-all')
      set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, is_read: true })),
        unreadCount: 0
      }))
    } catch (e) {
      console.error('Failed to mark all read', e)
    }
  },

  fetchInitialCount: async () => {
    try {
      const res = await api.get('/signals/unread-count')
      set({ unreadCount: res.data.count })
    } catch (e) {
      console.error('Failed to fetch unread count', e)
    }
  }
}))
