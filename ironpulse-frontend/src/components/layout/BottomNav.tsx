import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../../store/authStore'

export default function BottomNav() {
  const location = useLocation()
  const { user } = useAuthStore()
  const isVip = user?.role === 'vip' || user?.role === 'admin'

  const navItems = [
    { label: 'Feed', icon: 'dynamic_feed', path: '/feed' },
    { label: 'Train', icon: 'fitness_center', path: '/training' },
    { label: 'Battles', icon: 'bolt', path: '/challenges' },
    { label: 'Log', icon: 'receipt_long', path: '/battle-log' },
    { label: 'Profile', icon: 'person', path: '/profile' },
  ]

  return (
    <nav className="fixed bottom-0 w-full z-50 bg-black/80 backdrop-blur-[20px] backdrop-saturate-150 rounded-t-xl h-20 flex justify-around items-center px-4 pb-4 border-t border-outline-variant/30">
      {navItems.map((item) => {
        const isActive = location.pathname.startsWith(item.path)
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center w-16 h-12 relative cursor-pointer transition-colors ${
              isActive ? 'text-[#CCFF00]' : 'text-gray-500 hover:text-white'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-[#CCFF00]/10 rounded-xl"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className={`relative z-10 material-symbols-outlined text-2xl ${isActive ? 'font-variation-fill drop-shadow-[0_0_12px_rgba(202,253,0,0.4)]' : ''}`}>{item.icon}</span>
            <span className={`relative z-10 font-label text-[10px] uppercase tracking-widest leading-none mt-1 transition-all ${isActive ? 'drop-shadow-[0_0_12px_rgba(202,253,0,0.4)]' : ''}`}>
              {item.label}
            </span>
          </Link>
        )
      })}

      {/* VIP tab — gold star for VIP/admin, locked crown for free users */}
      <Link
        to={isVip ? '/vip-hub' : '/vip-access'}
        className={`flex flex-col items-center justify-center w-16 h-12 relative cursor-pointer transition-colors ${
          location.pathname.startsWith('/vip') ? 'text-[#d4af37]' : 'text-gray-500 hover:text-[#d4af37]'
        }`}
      >
        {location.pathname.startsWith('/vip') && (
          <motion.div
            layoutId="activeTab"
            className="absolute inset-0 bg-[#d4af37]/10 rounded-xl"
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        )}
        <span className={`relative z-10 material-symbols-${isVip ? 'filled' : 'outlined'} text-2xl ${
          location.pathname.startsWith('/vip') ? 'drop-shadow-[0_0_12px_rgba(212,175,55,0.6)]' : ''
        }`}>
          {isVip ? 'workspace_premium' : 'lock'}
        </span>
        <span className={`relative z-10 font-label text-[10px] uppercase tracking-widest leading-none mt-1 ${
          location.pathname.startsWith('/vip') ? 'text-[#d4af37] drop-shadow-[0_0_12px_rgba(212,175,55,0.4)]' : ''
        }`}>
          {isVip ? 'VIP' : 'Unlock'}
        </span>
      </Link>
    </nav>
  )
}
