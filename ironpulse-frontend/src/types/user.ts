// ── User types ───────────────────────────────────────

export type UserRole = 'user' | 'vip' | 'admin'
export type ExperienceLevel = 'recruit' | 'operator' | 'elite' | 'commander'
export type PrimaryGoal = 'mass_gain' | 'fat_loss' | 'endurance' | 'recomp'

export interface User {
  id: string
  email: string
  username: string
  display_name: string
  avatar_url: string | null
  role: UserRole
  is_active: boolean
  is_verified: boolean
  experience_level: ExperienceLevel | null
  primary_goal: PrimaryGoal | null
  height_cm: number | null
  weight_kg: number | null
  training_days_per_week: number
  preferred_training_time: string | null
  onboarding_complete: boolean
  current_streak: number
  longest_streak: number
  last_workout_date: string | null
  settings: Record<string, unknown> | null
  created_at: string
}

export interface UserStats {
  total_workouts: number
  total_sessions: number
  total_duration_min: number
  total_volume_kg: number
  current_streak: number
  longest_streak: number
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
  user: User
}
