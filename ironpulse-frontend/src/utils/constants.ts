export const API_BASE = '/api/v1'

export const COLORS = {
  primary: '#f3ffca',
  primaryFixed: '#cafd00',
  secondary: '#ff7168',
  secondaryContainer: '#c00018',
  background: '#0e0e0e',
  surface: '#0e0e0e',
  surfaceContainer: '#1a1a1a',
  onSurface: '#ffffff',
  onSurfaceVariant: '#adaaaa',
  outline: '#767575',
  outlineVariant: '#484847',
} as const

export const VIP_PLANS = {
  monthly: { price: 39.0, label: 'Monthly', days: 30 },
  annual: { price: 299.0, label: 'Annual', days: 365 },
} as const

export const SST_RATE = 0.06

export const EXPERIENCE_LEVELS = [
  { value: 'recruit', label: 'Recruit', desc: 'Just starting out' },
  { value: 'operator', label: 'Operator', desc: '6-18 months experience' },
  { value: 'elite', label: 'Elite', desc: '2+ years consistent training' },
  { value: 'commander', label: 'Commander', desc: '5+ years, advanced lifter' },
] as const

export const PRIMARY_GOALS = [
  { value: 'mass_gain', label: 'Mass Gain', icon: 'trending_up' },
  { value: 'fat_loss', label: 'Fat Loss', icon: 'local_fire_department' },
  { value: 'endurance', label: 'Endurance', icon: 'directions_run' },
  { value: 'recomp', label: 'Recomposition', icon: 'swap_vert' },
] as const
