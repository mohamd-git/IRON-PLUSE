import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useNotificationStore } from '../../store/notificationStore'
import { useAuthStore } from '../../store/authStore'
import Avatar from '../ui/Avatar'
import type { ReactNode } from 'react'

export interface TopHeaderProps {
  title?: string
  showAvatar?: boolean
  showDesktopNav?: boolean
  rightContent?: ReactNode
  showBack?: boolean
}

export default function TopHeader({ title, showAvatar, showDesktopNav, rightContent, showBack }: TopHeaderProps) {
  // Detail pages with a back button don't show the main nav — it would float off-center
  const shouldShowNav = showDesktopNav ?? !showBack
  const { unreadCount } = useNotificationStore()
  const { user } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()

  const desktopNavItems = [
    { label: 'DASHBOARD', path: '/' },
    { label: 'LOUNGE', path: '/vip-lounge' },
    { label: 'SESSION', path: '/workout/active' },
    { label: 'COMMAND', path: '/settings' },
  ]

  return (
    <header className="fixed top-0 w-full z-50 bg-black/60 backdrop-blur-xl h-16 px-6 border-b border-outline-variant/30 flex items-center justify-between">
      {/* Left */}
      <div className="flex items-center gap-3">
        {showBack ? (
          <button onClick={() => navigate(-1)} className="flex items-center justify-center p-1.5 rounded-full hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-white">arrow_back</span>
          </button>
        ) : (
          <div className="flex items-center gap-3">
            {showAvatar && <Avatar src={user?.avatar_url} name={user?.display_name} size="sm" />}
            <Link to="/" className="font-headline text-xl font-black text-[#CCFF00] tracking-tighter italic">
              {title || 'IRON PULSE'}
            </Link>
          </div>
        )}
      </div>

      {/* Center (Desktop Nav) */}
      {shouldShowNav && (
        <nav className="hidden md:flex items-center gap-6 absolute left-1/2 -translate-x-1/2">
          {desktopNavItems.map(item => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`font-label text-xs uppercase tracking-widest transition-colors ${
                  isActive ? 'text-[#CCFF00] underline underline-offset-4' : 'text-on-surface-variant hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      )}

      {/* Right */}
      <div className="flex items-center gap-3">
        {rightContent}
        <Link to="/signals" className="relative p-1.5 rounded-full hover:bg-[#1a1a1a] transition-colors">
          <span className="material-symbols-outlined text-[#adaaaa] hover:text-white transition-colors">notifications</span>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#ff7168] text-[9px] font-label font-bold rounded-full flex items-center justify-center text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
        <Link to="/profile" className="relative p-0.5 rounded-full hover:ring-2 hover:ring-[#cafd00]/40 transition-all">
          <Avatar src={user?.avatar_url} name={user?.display_name} size="sm" />
        </Link>
      </div>
    </header>
  )
}
