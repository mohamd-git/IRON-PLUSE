import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkoutStore } from '../store/workoutStore'

export function useWorkoutSession() {
  const navigate = useNavigate()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isSetupRef = useRef(false)
  
  const tick = useWorkoutStore(s => s.tick)
  const newPRs = useWorkoutStore(s => s.newPRs)
  const totalVolumeKg = useWorkoutStore(s => s.totalVolumeKg)
  
  // Expose store selectors for the UI
  const store = useWorkoutStore()

  // On mount: prompt for orphaned session recovery
  useEffect(() => {
    if (!isSetupRef.current) {
      isSetupRef.current = true
      // The store is already persisted to localStorage by Zustand setup
      // We can just verify if an active one exists on mount:
      const { isActive, sessionName } = useWorkoutStore.getState()
      if (isActive) {
        // Technically this could be a window prompt but for now it's naturally restored via Zustand.
        // A UI prompt can be handled at the component level if desired.
        console.log(`Recovered session: ${sessionName}`)
      }
    }
  }, [])

  // Timer interval dispatch
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      tick()
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      // Zustand handles the explicit persist on unmount inherently via middleware.
    }
  }, [tick])

  // Watch for PRs
  useEffect(() => {
    if (newPRs > 0) {
      // In a real app we might want to capture the specific PR data that triggered this.
      // We route to pr-celebration passing the data.
      navigate('/pr-celebration', { 
        state: { prCount: newPRs, volume: totalVolumeKg }
      })
    }
  }, [newPRs, totalVolumeKg, navigate])

  return store
}
