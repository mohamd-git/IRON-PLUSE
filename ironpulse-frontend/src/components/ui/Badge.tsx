interface BadgeProps { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'error' | 'vip'; className?: string }
const v = { default: 'bg-surface-container-highest text-on-surface-variant', success: 'bg-success/20 text-success', warning: 'bg-warning/20 text-warning', error: 'bg-error/20 text-error', vip: 'bg-primary-fixed/20 text-primary-fixed' }
export default function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-label font-semibold ${v[variant]} ${className}`}>{children}</span>
}
