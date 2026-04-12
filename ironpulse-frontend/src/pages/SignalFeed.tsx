import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { formatRelative } from '../utils/formatters'
import { useNotificationStore } from '../store/notificationStore'
import TopHeader from '../components/layout/TopHeader'
import Skeleton from '../components/ui/Skeleton'

const TABS = ['ALL', 'CHALLENGES', 'PRS', 'SOCIAL', 'SYSTEM']

export default function SignalFeed() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeFilter = searchParams.get('type') || 'ALL'
  const { notifications, markAllRead } = useNotificationStore()
  const [loading, setLoading] = useState(true)

  // Faking load state logic on mount since memory is fast
  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(false)
      markAllRead() // Per spec: mark all read after 2 seconds
    }, 2000)
    return () => clearTimeout(t)
  }, [markAllRead])

  // Fake populating local notifications if empty since we don't have websocket populated history normally without a hard backend sync
  const localSignals = notifications.length > 0 ? notifications : [
    { id: '1', notification_type: 'challenge', title: 'Target Acquired', body: 'Agent HUDSON challenged you to the Iron Marathon.', is_read: false, created_at: new Date(Date.now() - 360000).toISOString() },
    { id: '2', notification_type: 'social', title: 'Squad Support', body: 'Dr. Mike and 4 others verified your activity.', is_read: false, created_at: new Date(Date.now() - 7200000).toISOString() },
    { id: '3', notification_type: 'pr', title: 'PR Acknowledged', body: 'Database synced your 315 LBS Deadlift metrics globally.', is_read: true, created_at: new Date(Date.now() - 86400000).toISOString() },
    { id: '4', notification_type: 'system', title: 'Telemetry Update', body: 'System maintenance scheduled for 0400 HOURS.', is_read: true, created_at: new Date(Date.now() - 172800000).toISOString() },
  ]

  // Native map lookup
  type NotifyMapValues = { icon: string; bg: string; text: string; ring: string }
  const getTypeMap = (type: string): NotifyMapValues | undefined  => {
    const table: Record<string, NotifyMapValues> = {
      challenge: { icon: 'bolt', bg: 'bg-[#c00018]/20', text: 'text-[#ff7168]', ring: 'border-[#ff7168]' },
      pr: { icon: 'trophy', bg: 'bg-[#cafd00]/20', text: 'text-[#cafd00]', ring: 'border-[#cafd00]' },
      social: { icon: 'people', bg: 'bg-blue-500/20', text: 'text-blue-400', ring: 'border-blue-400' },
      system: { icon: 'cell_tower', bg: 'bg-[#262626]', text: 'text-[#adaaaa]', ring: 'border-[#484847]' }
    }
    return table[type] || table['system']
  }

  const setFilter = (t: string) => {
    if (t === 'ALL') searchParams.delete('type')
    else searchParams.set('type', t)
    setSearchParams(searchParams)
  }

  const filtered = activeFilter === 'ALL' ? localSignals : localSignals.filter(s => s.notification_type === activeFilter.toLowerCase())

  return (
    <div className="bg-[#0e0e0e] min-h-screen pb-32">
      <TopHeader 
        showBack 
        title="SIGNAL FEED" 
        rightContent={<button onClick={markAllRead} className="text-[#cafd00] font-headline font-bold text-[10px] tracking-widest uppercase hover:text-white transition-colors">MARK READ</button>} 
      />
      
      <main className="w-full max-w-lg mx-auto pt-[80px] px-4">
        {/* Filter Tab Array */}
        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 mb-4 -mx-4 px-4 border-b border-[#484847]/30">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`pb-3 font-headline font-bold text-xs tracking-widest uppercase transition-colors shrink-0 relative ${activeFilter === tab ? 'text-[#cafd00]' : 'text-[#adaaaa] hover:text-white'}`}
            >
              {tab}
              {activeFilter === tab && (
                <motion.div layoutId="sig-tab-underline" className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-[#cafd00]" />
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4"><Skeleton variant="card" className="h-24" /><Skeleton variant="card" className="h-24" /></div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filtered.map(signal => {
                const config = getTypeMap(signal.notification_type)
                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    key={signal.id} 
                    className={`bg-[#1a1a1a] rounded-xl p-4 flex items-start gap-4 transition-colors ${!signal.is_read ? `border-l-2 ${config?.ring} bg-[#1a1a1a]/80` : 'border border-[#484847]/30 opacity-60'}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex justify-center items-center shrink-0 ${config?.bg} ${config?.text}`}>
                      <span className="material-symbols-filled text-lg">{config?.icon}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className={`font-headline font-black text-sm uppercase tracking-wider truncate mr-2 ${!signal.is_read ? 'text-white' : 'text-[#adaaaa]'}`}>
                          {signal.title}
                        </h4>
                        <span className="font-label text-[9px] uppercase tracking-widest text-[#484847] shrink-0 whitespace-nowrap pt-1">
                          {formatRelative(signal.created_at)}
                        </span>
                      </div>
                      <p className="text-sm font-body text-[#adaaaa] leading-snug">{signal.body}</p>

                      {signal.notification_type === 'challenge' && (
                        <div className="mt-3">
                          <button className="bg-[#cafd00] hover:bg-white text-black font-headline font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded transition-colors shadow-[0_0_10px_rgba(202,253,0,0.1)]">
                            ACCEPT
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {filtered.length === 0 && (
              <div className="text-center py-20 flex flex-col items-center">
                <span className="material-symbols-outlined text-txl text-[#262626] mb-4 text-6xl">cell_tower</span>
                <p className="font-headline text-lg font-black italic tracking-tighter uppercase text-[#adaaaa]">COMMS CHANNEL CLEAR</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
