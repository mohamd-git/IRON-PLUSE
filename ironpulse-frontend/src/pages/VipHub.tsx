import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { motion } from 'framer-motion'
import Button from '../components/ui/Button'

export default function VipHub() {
  const { user } = useAuthStore()
  const isVip = user?.role === 'vip' || user?.role === 'admin'

  const cards = [
    {
      title: 'VIP COMMAND',
      subtitle: 'AI Coach & elite analytics',
      icon: 'psychology',
      path: '/vip-dashboard',
      accent: '#d4af37',
      locked: !isVip,
    },
    {
      title: 'OPERATOR LOUNGE',
      subtitle: 'Exclusive live chat with top operators',
      icon: 'forum',
      path: '/vip-lounge',
      accent: '#d4af37',
      locked: !isVip,
    },
    {
      title: 'ACTIVATE VIP',
      subtitle: 'Unlock all elite features',
      icon: 'workspace_premium',
      path: '/vip-access',
      accent: '#cafd00',
      locked: false,
      hideWhenVip: true,
    },
  ].filter(c => !(c.hideWhenVip && isVip))

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="font-headline text-4xl font-black text-white italic tracking-tighter uppercase leading-none">
          VIP HUB
        </h1>
        <p className="text-[#adaaaa] font-body text-xs mt-1">
          {isVip ? 'Elite access active.' : 'Upgrade to unlock elite protocols.'}
        </p>
      </div>

      {isVip && (
        <div className="flex items-center gap-3 bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-2xl px-4 py-3">
          <span className="material-symbols-filled text-[#d4af37] text-xl">verified</span>
          <div>
            <p className="font-headline font-black text-sm uppercase text-white">ELITE STATUS ACTIVE</p>
            <p className="font-label text-[10px] tracking-widest text-[#adaaaa] uppercase">Full clearance granted</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.path}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Link to={card.locked ? '/vip-access' : card.path} className="block">
              <div
                className="relative bg-[#1a1a1a] border rounded-3xl p-6 flex items-center gap-5 overflow-hidden group transition-all hover:brightness-110"
                style={{ borderColor: card.locked ? '#484847' : `${card.accent}40` }}
              >
                {/* Glow */}
                {!card.locked && (
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: `radial-gradient(circle at 20% 50%, ${card.accent}10 0%, transparent 60%)` }}
                  />
                )}

                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: card.locked ? '#262626' : `${card.accent}15`, border: `1px solid ${card.locked ? '#484847' : card.accent + '40'}` }}
                >
                  <span className="material-symbols-filled text-2xl" style={{ color: card.locked ? '#484847' : card.accent }}>
                    {card.icon}
                  </span>
                </div>

                <div className="flex-1">
                  <h3 className="font-headline font-black text-base uppercase tracking-tight text-white">{card.title}</h3>
                  <p className="font-body text-xs text-[#adaaaa] mt-0.5">{card.subtitle}</p>
                </div>

                {card.locked ? (
                  <span className="material-symbols-outlined text-[#484847] text-xl shrink-0">lock</span>
                ) : (
                  <span className="material-symbols-outlined shrink-0 text-xl" style={{ color: card.accent }}>arrow_forward</span>
                )}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {!isVip && (
        <Link to="/vip-access">
          <Button fullWidth icon="workspace_premium" className="!bg-gradient-to-r !from-[#d4af37] !to-[#b38b22] !text-black !border-none shadow-[0_0_20px_rgba(212,175,55,0.2)]">
            UNLOCK VIP ACCESS
          </Button>
        </Link>
      )}
    </div>
  )
}

