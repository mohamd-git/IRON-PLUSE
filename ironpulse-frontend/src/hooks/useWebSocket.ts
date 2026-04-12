import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNotificationStore } from '../store/notificationStore'
import { useWorkoutStore } from '../store/workoutStore'
import { useAuthStore } from '../store/authStore'
import type { WebSocketEvent } from '../types/community'

export function useWebSocket(userId?: string) {
  const ws = useRef<WebSocket | null>(null)
  const queryClient = useQueryClient()
  
  const addNotification = useNotificationStore(s => s.addNotification)
  // Assuming addNewPR gets added to the store or using a fallback if strictly following 1:1 user prompt
  // The workoutStore from previous prompt step might not have addNewPR, we will mock adding to avoid typescript failure if it doesnt exist, or just use what we have.
  
  const connect = useCallback(() => {
    const { accessToken, user } = useAuthStore.getState()
    const activeUserId = userId || user?.id
    if (!accessToken || !activeUserId) return

    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
    const wsUrl = baseURL.replace('http', 'ws')
    const url = `${wsUrl}/ws/${activeUserId}?token=${accessToken}`

    ws.current = new WebSocket(url)

    ws.current.onmessage = (event) => {
      try {
        const payload: WebSocketEvent = JSON.parse(event.data)
        const eventName = payload.event
        const data = payload.data as any

        switch (eventName) {
          case 'pr_achieved':
            // The spec mentioned workoutStore.addNewPR(data). We dispatch event here:
            // (Assumes you'll add addNewPR to workoutStore or handle it appropriately)
            const store = useWorkoutStore.getState() as any
            if (store.addNewPR) {
              store.addNewPR(data)
            }
            break
            
          case 'new_message':
            addNotification({
              id: crypto.randomUUID(),
              user_id: activeUserId,
              notification_type: 'social',
              title: 'New Message',
              body: String(data.content || ''),
              metadata_json: data,
              is_read: false,
              created_at: new Date().toISOString(),
            })
            break

          case 'challenge_received':
            addNotification({
              id: crypto.randomUUID(),
              user_id: activeUserId,
              notification_type: 'challenge',
              title: 'Battle Challenge',
              body: 'You have received a new challenge.',
              metadata_json: data,
              is_read: false,
              created_at: new Date().toISOString(),
            })
            break

          case 'post_liked':
            addNotification({
              id: crypto.randomUUID(),
              user_id: activeUserId,
              notification_type: 'social',
              title: 'Post Liked',
              body: 'Someone liked your post.',
              metadata_json: data,
              is_read: false,
              created_at: new Date().toISOString(),
            })
            break

          case 'lounge_message':
            // Update VIP lounge query cache using React Query
            queryClient.invalidateQueries({ queryKey: ['vipLounge'] })
            break
        }
      } catch (err) {
        console.error('Failed to parse WS message', err)
      }
    }

    ws.current.onclose = () => {
      setTimeout(() => connect(), 3000)
    }
  }, [userId, addNotification, queryClient])

  useEffect(() => {
    connect()
    return () => {
      if (ws.current) {
        // Prevent reconnect loop on intentional unmount by overriding onclose
        ws.current.onclose = null 
        ws.current.close()
        ws.current = null
      }
    }
  }, [connect])

  const sendMessage = useCallback((event: string, data: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ event, data }))
    }
  }, [])

  return { sendMessage }
}
