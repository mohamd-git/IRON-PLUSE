// ── Workout types ────────────────────────────────────

export type Difficulty = 'beginner' | 'intermediate' | 'advanced'
export type SessionStatus = 'active' | 'completed' | 'abandoned'

export interface Exercise {
  id: string
  name: string
  category: string
  muscle_groups: string[] | null
  equipment: string[] | null
  difficulty: Difficulty
  description: string | null
  form_steps: string[] | null
  image_url: string | null
  video_url: string | null
  created_at: string
}

export interface WorkoutTemplate {
  id: string
  name: string
  description: string | null
  category: string
  difficulty: Difficulty
  duration_minutes: number
  trainer_name: string | null
  trainer_avatar_url: string | null
  is_vip_only: boolean
  thumbnail_url: string | null
  exercises: TemplateExercise[] | null
  created_at: string
}

export interface TemplateExercise {
  exercise_id: string
  sets: number
  reps: number
  rest_seconds: number
  notes: string | null
  exercise?: Exercise
}

export interface WorkoutSession {
  id: string
  user_id: string
  template_id: string | null
  name: string
  started_at: string
  completed_at: string | null
  duration_seconds: number | null
  total_volume_kg: number | null
  notes: string | null
  gym_id: string | null
  status: SessionStatus
  sets: WorkoutSet[]
  created_at: string
}

export interface WorkoutSet {
  id: string
  session_id: string
  exercise_id: string
  set_number: number
  reps: number | null
  weight_kg: number | null
  duration_seconds: number | null
  is_pr: boolean
  rpe: number | null
  logged_at: string
}

export interface PersonalRecord {
  id: string
  user_id: string
  exercise_id: string
  weight_kg: number
  reps: number
  one_rep_max: number
  achieved_at: string
  session_id: string | null
  created_at: string
}

export interface LogSetRequest {
  exercise_id: string
  set_number: number
  reps: number
  weight_kg: number
  rpe?: number
}

export interface LogSetResponse {
  set: WorkoutSet
  is_pr: boolean
  pr?: PersonalRecord
  total_volume_kg: number
}
