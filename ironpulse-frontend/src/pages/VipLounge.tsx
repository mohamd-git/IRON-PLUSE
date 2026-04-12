import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import PageWrapper from '../components/layout/PageWrapper'
import api from '../api/client'

const SECTIONS = ['LOUNGE', 'PROGRAMS', 'LEADERBOARD', 'CHALLENGES']

const MOCK_PROGRAMS = [
  { id: '1', title: 'Black Ops Hypertrophy', trainer: 'Coach Elias', duration: '8 WEEKS', image: '/training/athlete-2.jpg', tag: 'EXCLUSIVE' },
  { id: '2', title: 'Phase V: Elite Metcon', trainer: 'Dr. Mike', duration: '45 MIN', image: '/training/athlete-4.jpg', tag: 'NEW DROP' },
  { id: '3', title: 'Titan Strength Protocol', trainer: 'Rex L.', duration: '12 WEEKS', image: '/training/athlete-1.jpg', tag: 'POPULAR' },
  { id: '4', title: 'Operator Conditioning', trainer: 'Alex C.', duration: '6 WEEKS', image: '/training/athlete-5.jpg', tag: 'LIMITED' },
]

const MOCK_LEADERBOARD = [
  { rank: 1, name: 'JUGGERNAUT_89', volume: '142,400 KG', streak: 42, avatar: null, badge: 'TITAN' },
  { rank: 2, name: 'TitanForge', volume: '138,200 KG', streak: 38, avatar: null, badge: 'ELITE' },
  { rank: 3, name: 'Elias_VT', volume: '121,800 KG', streak: 31, avatar: null, badge: 'OPERATOR' },
  { rank: 4, name: 'Savage_100', volume: '118,500 KG', streak: 29, avatar: null, badge: 'OPERATOR' },
  { rank: 5, name: 'Kaelen_X', volume: '99,700 KG', streak: 22, avatar: null, badge: 'RECRUIT' },
]

const MOCK_CHALLENGES = [
  { id: '1', title: '100KM Vector Challenge', desc: 'Accumulate 100km total distance this week.', reward: 'Titanium Drop + 500 XP', ends: '3 days', participants: 47, progress: 68 },
  { id: '2', title: 'Iron Volume Week', desc: 'Log 10,000 KG total volume in 7 days.', reward: 'Exclusive Badge + 300 XP', ends: '5 days', participants: 83, progress: 42 },
  { id: '3', title: 'Elite Streak Lock', desc: 'Maintain a 14-day workout streak.', reward: 'VIP Profile Frame + 800 XP', ends: '11 days', participants: 31, progress: 57 },
]

export default function VIPLounge() {
  const { user } = useAuthStore()
  const [activeSection, setActiveSection] = useState('LOUNGE')
  const [messages, setMessages] = useState<any[]>([])
  const [chatInput, setChatInput] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMessages([
      { id: '1', user: { name: 'TitanForge', avatar: null }, text: 'Has anyone cracked the new Phase V block yet?', time: '04:12 PM' },
      { id: '2', user: { name: 'Elias_VT', avatar: null }, text: 'We cleared it. Push through the lactic build-up on the back half.', time: '04:15 PM' },
      { id: '3', user: { name: 'Kaelen', avatar: null }, text: 'Running the protocol in 2 hours. See you on the leaderboard.', time: '04:19 PM' },
    ])
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    const msg = {
      id: crypto.randomUUID(),
      user: { name: user?.display_name || 'OPERATOR', avatar: user?.avatar_url },
      text: chatInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    setMessages(prev => [...prev, msg])
    setChatInput('')
    try { await api.post('/vip/lounge', { content: msg.text }) } catch { /* optimistic */ }
  }

  return (
    <PageWrapper
      hideBottomNav
      headerProps={{
        title: 'ELITE LOUNGE',
        showBack: true,
        rightContent: (
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-[#cafd00] rounded-full animate-pulse" />
            <span className="font-label text-[9px] text-[#adaaaa] uppercase tracking-widest">247 ONLINE</span>
          </div>
        )
      }}
    >
      <style>{`
        .gold-shimmer {
          background: linear-gradient(90deg, #d4af37 0%, #ffeaa7 25%, #d4af37 50%, #b38b22 75%, #d4af37 100%);
          background-size: 200% auto;
          color: transparent;
          -webkit-background-clip: text;
          background-clip: text;
          animation: shimmerGold 4s linear infinite;
        }
        @keyframes shimmerGold {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>

      {/* Section Tabs */}
      <div className="flex border-b border-[#484847]/40 -mx-4 mb-4">
        {SECTIONS.map(s => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            className={`flex-1 py-3 font-headline font-black text-[10px] tracking-widest uppercase transition-colors relative ${activeSection === s ? 'text-white' : 'text-[#484847]'}`}
          >
            {s}
            {activeSection === s && (
              <motion.div layoutId="vip-tab" className="absolute bottom-0 left-0 w-full h-[2px] bg-[#d4af37]" />
            )}
          </button>
        ))}
      </div>

      {/* ── LOUNGE TAB ── */}
      {activeSection === 'LOUNGE' && (
        <div className="flex flex-col gap-4">
          {/* Online Users */}
          <div className="flex overflow-x-auto gap-3 pb-1 custom-scrollbar -mx-4 px-4">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="relative shrink-0">
                <Avatar size="sm" src={null} name={`VIP${i}`} className="ring-1 ring-[#d4af37]/40" />
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#cafd00] rounded-full border-2 border-[#0e0e0e]" />
              </div>
            ))}
          </div>

          {/* Pinned */}
          <div className="bg-[#d4af37]/5 border border-[#d4af37]/30 rounded-2xl px-4 py-3 flex items-start gap-2">
            <span className="material-symbols-filled text-[#d4af37] text-sm mt-0.5 shrink-0">push_pin</span>
            <p className="font-body text-xs text-white leading-snug">
              <span className="font-headline font-bold text-[#d4af37] mr-1.5">DIRECTIVE:</span>
              First 10 operators to hit 100km vector this week win the Titanium Drop.
            </p>
          </div>

          {/* Chat messages */}
          <div className="flex flex-col gap-3 min-h-[280px]">
            {messages.map(msg => {
              const isMine = msg.user.name === (user?.display_name || 'OPERATOR')
              return (
                <div key={msg.id} className={`flex flex-col max-w-[80%] ${isMine ? 'self-end items-end' : 'self-start items-start'}`}>
                  {!isMine && (
                    <div className="flex items-center gap-1 mb-1 px-1">
                      <span className="gold-shimmer font-headline font-black text-[10px] tracking-widest uppercase">{msg.user.name}</span>
                      <span className="material-symbols-filled text-[#d4af37] text-[10px]">verified</span>
                    </div>
                  )}
                  <div className={`px-4 py-2.5 rounded-2xl ${isMine ? 'bg-[#cafd00] text-black rounded-tr-none' : 'bg-[#1a1a1a] text-white rounded-tl-none border border-[#d4af37]/20'}`}>
                    <p className="text-sm font-body leading-relaxed">{msg.text}</p>
                  </div>
                  <span className="font-label text-[9px] uppercase tracking-widest text-[#484847] mt-1 px-1">{msg.time}</span>
                </div>
              )
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="flex gap-3 items-center">
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Transmit to the lounge..."
              className="flex-1 bg-[#1a1a1a] border border-[#d4af37]/30 rounded-xl px-4 py-3 text-white font-body text-sm placeholder-[#484847] outline-none focus:border-[#d4af37] transition-colors"
            />
            <button disabled={!chatInput.trim()} type="submit" className="w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b38b22] text-black disabled:opacity-40 transition-all">
              <span className="material-symbols-filled text-xl ml-0.5">send</span>
            </button>
          </form>
        </div>
      )}

      {/* ── PROGRAMS TAB ── */}
      {activeSection === 'PROGRAMS' && (
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5 custom-scrollbar">
          <div>
            <h2 className="font-headline font-black text-2xl italic uppercase tracking-tighter text-white leading-none">CLASSIFIED DROPS</h2>
            <p className="font-label text-[10px] tracking-widest text-[#adaaaa] uppercase mt-1">Exclusive protocols for VIP operators only</p>
          </div>

          <div className="space-y-4">
            {MOCK_PROGRAMS.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
              >
                <Link to={`/templates/${p.id}`} className="block">
                  <div className="relative h-44 rounded-3xl overflow-hidden group border border-[#d4af37]/20">
                    <img src={p.image} alt={p.title} className="absolute inset-0 w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-80 transition-all duration-700 mix-blend-luminosity" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                    <div className="absolute inset-0 p-5 flex flex-col justify-between">
                      <div className="flex justify-between">
                        <span className="bg-[#d4af37] text-black font-headline font-black text-[9px] px-3 py-1 rounded-full uppercase tracking-widest">{p.tag}</span>
                        <span className="bg-black/60 text-[#adaaaa] font-label text-[9px] px-3 py-1 rounded-full uppercase tracking-widest backdrop-blur-sm">{p.duration}</span>
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="font-label text-[9px] tracking-widest text-[#d4af37] uppercase mb-1">BY {p.trainer}</p>
                          <h3 className="font-headline font-black text-xl italic tracking-tighter uppercase text-white leading-none">{p.title}</h3>
                        </div>
                        <div className="bg-[#cafd00] text-black font-headline font-black text-[9px] px-3 py-2 rounded-full uppercase tracking-widest flex items-center gap-1 shrink-0">
                          ACCESS <span className="material-symbols-outlined text-xs">arrow_forward</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* VIP Coach Access Banner */}
          <Link to="/vip-dashboard">
            <div className="bg-gradient-to-r from-[#1a1a1a] to-[#262626] border border-[#d4af37]/40 rounded-3xl p-5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-center justify-center shrink-0">
                <span className="material-symbols-filled text-[#d4af37] text-2xl">psychology</span>
              </div>
              <div className="flex-1">
                <h4 className="font-headline font-black text-sm uppercase tracking-wide text-white">AI Coach — Cerebro</h4>
                <p className="font-label text-[9px] text-[#adaaaa] uppercase tracking-widest mt-0.5">Get a custom program built for you</p>
              </div>
              <span className="material-symbols-outlined text-[#d4af37]">arrow_forward</span>
            </div>
          </Link>
        </div>
      )}

      {/* ── LEADERBOARD TAB ── */}
      {activeSection === 'LEADERBOARD' && (
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5 custom-scrollbar">
          <div>
            <h2 className="font-headline font-black text-2xl italic uppercase tracking-tighter text-white">VIP RANKING</h2>
            <p className="font-label text-[10px] tracking-widest text-[#adaaaa] uppercase mt-1">Elite operators ranked by total volume</p>
          </div>

          {/* Top 3 Podium */}
          <div className="flex items-end justify-center gap-3 h-36 mb-4">
            {[MOCK_LEADERBOARD[1], MOCK_LEADERBOARD[0], MOCK_LEADERBOARD[2]].map((entry, i) => {
              const heights = ['h-24', 'h-36', 'h-20']
              const isFirst = entry.rank === 1
              return (
                <div key={entry.rank} className={`flex-1 ${heights[i]} rounded-t-2xl flex flex-col items-center justify-end pb-3 relative ${isFirst ? 'bg-gradient-to-t from-[#d4af37]/30 to-[#d4af37]/5 border border-[#d4af37]/50' : 'bg-[#1a1a1a] border border-[#484847]/40'}`}>
                  {isFirst && <span className="material-symbols-filled text-[#d4af37] text-base absolute -top-3">emoji_events</span>}
                  <Avatar size="sm" src={entry.avatar} name={entry.name} className={isFirst ? 'ring-2 ring-[#d4af37]' : ''} />
                  <p className="font-headline font-black text-[9px] text-white uppercase tracking-wide mt-1.5 truncate w-full text-center px-1">{entry.name.split('_')[0]}</p>
                  <p className={`font-headline font-black text-base ${isFirst ? 'text-[#d4af37]' : 'text-[#adaaaa]'}`}>#{entry.rank}</p>
                </div>
              )
            })}
          </div>

          {/* Full list */}
          <div className="bg-[#1a1a1a] rounded-3xl border border-[#484847]/40 overflow-hidden">
            {MOCK_LEADERBOARD.map((entry, i) => (
              <div key={entry.rank} className={`flex items-center gap-3 px-4 py-3.5 ${i < MOCK_LEADERBOARD.length - 1 ? 'border-b border-[#484847]/30' : ''}`}>
                <span className={`font-headline font-black text-sm w-6 text-center shrink-0 ${entry.rank === 1 ? 'text-[#d4af37]' : 'text-[#484847]'}`}>
                  {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                </span>
                <Avatar size="sm" src={entry.avatar} name={entry.name} className={entry.rank === 1 ? 'ring-1 ring-[#d4af37]' : ''} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-headline font-black text-xs text-white uppercase tracking-wide truncate">{entry.name}</p>
                    <span className="material-symbols-filled text-[#d4af37] text-[10px]">verified</span>
                  </div>
                  <p className="font-label text-[9px] text-[#adaaaa] uppercase tracking-widest">{entry.badge} · 🔥 {entry.streak} day streak</p>
                </div>
                <span className="font-headline font-black text-sm text-white shrink-0">{entry.volume}</span>
              </div>
            ))}
          </div>

          {/* My rank */}
          <div className="bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="material-symbols-outlined text-[#d4af37]">person</span>
            <div className="flex-1">
              <p className="font-headline font-black text-xs text-white uppercase">Your Rank</p>
              <p className="font-label text-[9px] text-[#adaaaa] uppercase tracking-widest">Keep training to climb</p>
            </div>
            <span className="font-headline font-black text-lg text-[#d4af37]">#—</span>
          </div>
        </div>
      )}

      {/* ── CHALLENGES TAB ── */}
      {activeSection === 'CHALLENGES' && (
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5 custom-scrollbar">
          <div>
            <h2 className="font-headline font-black text-2xl italic uppercase tracking-tighter text-white">VIP OPERATIONS</h2>
            <p className="font-label text-[10px] tracking-widest text-[#adaaaa] uppercase mt-1">Exclusive challenges · Real rewards</p>
          </div>

          {MOCK_CHALLENGES.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-[#1a1a1a] border border-[#d4af37]/20 rounded-3xl p-5 space-y-4"
            >
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                  <h3 className="font-headline font-black text-base uppercase tracking-tight text-white leading-tight">{c.title}</h3>
                  <p className="font-body text-xs text-[#adaaaa] mt-1 leading-relaxed">{c.desc}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-label text-[9px] tracking-widest text-[#ff7168] uppercase font-bold">ENDS IN</p>
                  <p className="font-headline font-black text-sm text-white">{c.ends}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-label text-[9px] uppercase tracking-widest text-[#adaaaa] font-bold">COMPLETION</span>
                  <span className="font-headline font-black text-xs text-white">{c.progress}%</span>
                </div>
                <div className="h-2 bg-[#262626] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${c.progress}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1 }}
                    className="h-full rounded-full bg-gradient-to-r from-[#d4af37] to-[#ffeaa7]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-[#484847]/30">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-filled text-[#cafd00] text-sm">workspace_premium</span>
                  <span className="font-label text-[9px] uppercase tracking-widest text-[#cafd00] font-bold">{c.reward}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#484847] text-sm">group</span>
                  <span className="font-label text-[9px] uppercase tracking-widest text-[#484847] font-bold">{c.participants} enrolled</span>
                </div>
              </div>

              <button className="w-full bg-gradient-to-r from-[#d4af37] to-[#b38b22] text-black font-headline font-black text-xs tracking-widest uppercase py-3 rounded-2xl hover:brightness-110 active:scale-95 transition-all">
                ENLIST NOW
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </PageWrapper>
  )
}
