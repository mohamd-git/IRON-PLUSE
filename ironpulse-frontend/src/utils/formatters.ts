import { format, formatDistanceToNow, parseISO } from 'date-fns'

export function formatDate(iso: string) {
  return format(parseISO(iso), 'dd MMM yyyy')
}

export function formatDateTime(iso: string) {
  return format(parseISO(iso), 'dd MMM yyyy, HH:mm')
}

export function formatRelative(iso: string) {
  return formatDistanceToNow(parseISO(iso), { addSuffix: true })
}

export function formatWeight(kg: number) {
  return `${kg.toLocaleString('en-MY', { maximumFractionDigits: 1 })} kg`
}

export function formatVolume(kg: number) {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`
  return `${kg.toFixed(0)} kg`
}

export function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m ${s}s`
}

export function formatCurrency(amount: number) {
  return `RM ${amount.toFixed(2)}`
}
