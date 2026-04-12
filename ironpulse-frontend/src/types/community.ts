// ── Community types ──────────────────────────────────

export interface Author {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
}

export type PostType = 'general' | 'pr' | 'workout_log' | 'physique' | 'challenge'

export interface Post {
  id: string
  user_id: string
  content: string
  post_type: PostType
  media_urls: string[] | null
  workout_session_id: string | null
  pr_id: string | null
  likes_count: number
  comments_count: number
  is_visible: boolean
  created_at: string
  updated_at: string
  author: Author | null
  is_liked_by_me: boolean
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  author: Author | null
}

export type ChallengeStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'expired'

export interface BattleChallenge {
  id: string
  challenger_id: string
  challenged_id: string
  exercise_id: string
  target_weight_kg: number | null
  target_reps: number | null
  status: ChallengeStatus
  expires_at: string | null
  created_at: string
}

export interface Message {
  id: string
  sender_id: string
  recipient_id: string
  content: string
  message_type: string
  metadata_json: Record<string, unknown> | null
  is_read: boolean
  created_at: string
}

export interface Conversation {
  partner_id: string
  partner_username: string
  partner_display_name: string
  partner_avatar_url: string | null
  last_message: Message
  unread_count: number
}

export type NotificationType = 'pr' | 'challenge' | 'social' | 'system'

export interface Notification {
  id: string
  user_id: string
  notification_type: NotificationType
  title: string
  body: string | null
  metadata_json: Record<string, unknown> | null
  is_read: boolean
  created_at: string
}

export interface PartnerCandidate {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  experience_level: string | null
  primary_goal: string | null
  training_days_per_week: number
  current_streak: number
  compatibility_score: number
}

export interface WebSocketEvent {
  event: string
  data: Record<string, unknown>
}
