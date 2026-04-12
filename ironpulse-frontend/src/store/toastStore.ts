import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'pr' | 'challenge' | 'message'

export interface ToastMessage {
  id: string
  message: string
  type: ToastType
  duration?: number
  metadata?: any
}

interface ToastState {
  toasts: ToastMessage[]
  addToast: (toast: ToastMessage) => void
  removeToast: (id: string) => void
}

const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, toast].slice(-3), // Stack max 3 toasts
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}))

export const useToast = () => {
  const { toasts, addToast, removeToast } = useToastStore()

  const showToast = (message: string, type: ToastType = 'info', duration?: number, metadata?: any) => {
    const id = Math.random().toString(36).substring(2, 9)
    let autoDismissDuration = duration
    
    // Fallback durations based on spec
    if (!autoDismissDuration) {
      if (type === 'success' || type === 'info') autoDismissDuration = 4000
      else if (type === 'error') autoDismissDuration = 6000
      else if (type === 'pr') autoDismissDuration = 8000
      else autoDismissDuration = 5000 // default for un-mapped
    }

    addToast({ id, message, type, duration: autoDismissDuration, metadata })

    if (autoDismissDuration !== Infinity) {
      setTimeout(() => {
        removeToast(id)
      }, autoDismissDuration)
    }
  }

  const dismissToast = (id: string) => {
    removeToast(id)
  }

  return { toasts, showToast, dismissToast }
}
