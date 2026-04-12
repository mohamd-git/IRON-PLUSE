// ── Payment types ────────────────────────────────────

export interface VipStatus {
  status: 'active' | 'cancelled' | 'expired' | 'trial' | 'none'
  plan: string | null
  started_at: string | null
  expires_at: string | null
  auto_renew: boolean
  price_myr: number | null
}

export interface PaymentInitiateRequest {
  plan: 'monthly' | 'annual'
  payment_method: 'fpx' | 'tng' | 'boost' | 'card'
  return_url: string
  gateway?: 'billplz' | 'toyyibpay'
}

export interface PaymentInitiateResponse {
  payment_id: string
  payment_url: string
  amount_myr: number
  sst_myr: number
  total_myr: number
}

export interface PaymentRecord {
  id: string
  user_id: string
  amount_myr: number
  payment_method: string
  provider: string
  provider_payment_id: string | null
  status: string
  plan: string
  metadata_json: Record<string, unknown> | null
  created_at: string
  completed_at: string | null
}

export interface PaymentVerify {
  payment_id: string
  status: string
  paid: boolean
  completed_at: string | null
}

export interface Gym {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  latitude: number | null
  longitude: number | null
  phone: string | null
  hours: Record<string, unknown> | null
  is_24h: boolean
  is_vip_partner: boolean
  features: string[] | null
  photo_urls: string[] | null
  rating: number | null
  review_count: number
  distance_km?: number
}
