import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface ActiveExercise {
  id: string
  name: string
  sets: {
    reps: number
    weight_kg: number
    is_pr: boolean
  }[]
}

interface WorkoutState {
  sessionId: string | null
  sessionName: string
  startedAt: string | null
  exercises: ActiveExercise[]
  currentExerciseIndex: number
  currentSetIndex: number
  isResting: boolean
  restSecondsRemaining: number
  elapsedSeconds: number
  totalVolumeKg: number
  newPRs: number
  isActive: boolean
  isPaused: boolean

  // Actions
  startSession: (id: string, name: string) => void
  logSet: (exerciseId: string, name: string, reps: number, weight_kg: number, is_pr: boolean) => void
  nextExercise: () => void
  startRest: (seconds: number) => void
  skipRest: () => void
  togglePause: () => void
  tick: () => void
  completeSession: () => void
  abandonSession: () => void
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set) => ({
      sessionId: null,
      sessionName: '',
      startedAt: null,
      exercises: [],
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      isResting: false,
      restSecondsRemaining: 0,
      elapsedSeconds: 0,
      totalVolumeKg: 0,
      newPRs: 0,
      isActive: false,
      isPaused: false,

      startSession: (id, name) => set({
        sessionId: id,
        sessionName: name,
        startedAt: new Date().toISOString(),
        exercises: [],
        currentExerciseIndex: 0,
        currentSetIndex: 0,
        isResting: false,
        restSecondsRemaining: 0,
        elapsedSeconds: 0,
        totalVolumeKg: 0,
        newPRs: 0,
        isActive: true,
        isPaused: false,
      }),

      logSet: (exerciseId, name, reps, weight_kg, is_pr) => set((state) => {
        const exercises = [...state.exercises]
        let currentEx = exercises.find(e => e.id === exerciseId)
        if (!currentEx) {
          currentEx = { id: exerciseId, name, sets: [] }
          exercises.push(currentEx)
        }
        currentEx.sets.push({ reps, weight_kg, is_pr })

        return {
          exercises,
          totalVolumeKg: state.totalVolumeKg + (reps * weight_kg),
          newPRs: state.newPRs + (is_pr ? 1 : 0),
          currentSetIndex: state.currentSetIndex + 1
        }
      }),

      nextExercise: () => set((state) => ({
        currentExerciseIndex: state.currentExerciseIndex + 1,
        currentSetIndex: 0
      })),

      startRest: (seconds) => set({
        isResting: true,
        restSecondsRemaining: seconds
      }),

      skipRest: () => set({
        isResting: false,
        restSecondsRemaining: 0
      }),

      togglePause: () => set((state) => ({ isPaused: !state.isPaused })),

      tick: () => set((state) => {
        if (!state.isActive || state.isPaused) return state
        
        const updates: Partial<WorkoutState> = {
          elapsedSeconds: state.elapsedSeconds + 1
        }
        
        if (state.isResting && state.restSecondsRemaining > 0) {
          updates.restSecondsRemaining = state.restSecondsRemaining - 1
          if (updates.restSecondsRemaining === 0) {
            updates.isResting = false
          }
        }
        
        return updates
      }),

      completeSession: () => set({
        isActive: false,
        isResting: false,
        isPaused: false,
      }),

      abandonSession: () => set({
        sessionId: null,
        sessionName: '',
        startedAt: null,
        exercises: [],
        isActive: false,
        isResting: false,
        elapsedSeconds: 0,
        totalVolumeKg: 0
      })
    }),
    {
      name: 'ironpulse-active-session',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
