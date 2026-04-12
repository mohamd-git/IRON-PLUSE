import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import api from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useNotificationStore } from '../store/notificationStore'

import { useCountUp } from '../hooks/useCountUp'

import SystemInitializing from '../components/dashboard/SystemInitializing'
import Skeleton from '../components/ui/Skeleton'
import WeeklyVolumeBar from '../components/charts/WeeklyVolumeBar'
import RecoveryRing from '../components/charts/RecoveryRing'
import Button from '../components/ui/Button'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'

// ── Motion Variants ────────────────────────────────────
const containerVars = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
}

const itemVars = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: 'easeOut' as const } }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const notifications = useNotificationStore(s => s.notifications)
  const unreadCount = useNotificationStore(s => s.unreadCount)

  // Redirect if not onboarded
  useEffect(() => {
    if (user && !user.onboarding_complete) {
      navigate('/onboarding')
    }
  }, [user, navigate])

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', user?.id],
    queryFn: async () => {
      // Intended endpoint: GET /users/me/analytics
      // We will catch and provide a highly populated mock if it 404s/fails so the UI doesn't crash during development
      try {
        const res = await api.get('/users/me/analytics')
        return res.data
      } catch (err) {
        console.warn('Analytics endpoint failed, using mock data layout.')
        return {
          total_sessions: 12,
          weekly_volume_kg: 33700,
          volume_data: [
            { day: 'Mon', volume: 6400 },
            { day: 'Tue', volume: 8200 },
            { day: 'Wed', volume: 0 },
            { day: 'Thu', volume: 7100 },
            { day: 'Fri', volume: 9500 },
            { day: 'Sat', volume: 2500 },
            { day: 'Sun', volume: 0 },
          ],
          streak: 4,
          recent_prs: [
            { id: '1', exercise: 'Bench Press', metric: '100kg x 5', date: 'Yesterday' },
            { id: '2', exercise: 'Deadlift', metric: '180kg x 3', date: '2 days ago' },
            { id: '3', exercise: 'Squat', metric: '140kg x 5', date: '3 days ago' }
          ],
          recovery_score: 82,
          muscle_heatmap: {
            chest: 'today',
            back: 'not_trained',
            legs: '2_days_ago',
            arms: 'today',
            core: 'not_trained'
          },
          next_protocol: 'Hypertrophy Block C - Legs',
          leaderboard: [
            { id: 'A', name: 'Juggernaut_89', volume: '142t', avatar: null },
            { id: 'B', name: user?.display_name || 'You', volume: '33t', avatar: user?.avatar_url },
            { id: 'C', name: 'IronMaiden', volume: '29t', avatar: null }
          ]
        }
      }
    },
    enabled: !!user?.onboarding_complete
  })

  // Must be called unconditionally before any early returns (Rules of Hooks)
  const animatedVolume = useCountUp(analytics?.weekly_volume_kg || 0)
  const animatedStreak = useCountUp(analytics?.streak || 0)

  // Date Math
  const today = new Date()
  const start = format(startOfWeek(today, { weekStartsOn: 1 }), 'MMM d')
  const end = format(endOfWeek(today, { weekStartsOn: 1 }), 'MMM d, yyyy')

  if (isLoading) {
    return (
      <div className="space-y-6 pt-2">
        <Skeleton variant="text" className="w-48 h-3" />
        <div className="mb-10 space-y-4">
          <Skeleton variant="text" className="w-64 h-12" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 auto-rows-[160px]">
          <Skeleton variant="card" className="md:col-span-8 h-full" />
          <Skeleton variant="card" className="md:col-span-4 h-full" />
          <Skeleton variant="card" className="md:col-span-4 h-full" />
          <Skeleton variant="card" className="md:col-span-4 h-full" />
          <Skeleton variant="card" className="md:col-span-8 h-full" />
          <Skeleton variant="card" className="md:col-span-12 h-full min-h-[100px]" />
          <Skeleton variant="card" className="md:col-span-6 h-full" />
          <Skeleton variant="card" className="md:col-span-6 h-full" />
        </div>
      </div>
    )
  }

  if (analytics && analytics.total_sessions === 0) {
    return <SystemInitializing />
  }

  // Legend dot color
  const getMuscleColor = (status: string) => {
    if (status === 'today') return '#cafd00'
    if (status === '2_days_ago') return '#4d6100'
    return '#262626'
  }

  // Overlay color on top of the image — transparent for untrained (shows image as-is)
  const getOverlayColor = (status: string) => {
    if (status === 'today') return '#cafd00'
    if (status === '2_days_ago') return '#4d6100'
    return 'transparent'
  }

  // Overlay opacity per status
  const getOverlayOpacity = (status: string) => {
    if (status === 'today') return 0.45
    if (status === '2_days_ago') return 0.3
    return 0
  }

  return (
    <div className="space-y-6 pt-2 pb-10">
      {/* Status Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#cafd00] opacity-50"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#cafd00]"></span>
        </div>
        <span className="font-label text-xs font-semibold tracking-widest text-[#cafd00] uppercase">
          OPERATOR_STATUS: ACTIVE
        </span>
      </div>

      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-black font-headline uppercase italic tracking-tighter text-white">
          WEEKLY COMMAND
        </h1>
        <p className="text-[#adaaaa] font-body text-sm mt-1 uppercase tracking-widest">
          {user?.username || 'AGENT'} // {start} – {end}
        </p>
      </div>

      <motion.div 
        variants={containerVars} 
        initial="hidden" 
        animate="show" 
        className="grid grid-cols-1 md:grid-cols-12 md:auto-rows-[160px] gap-4"
      >
        {/* 1. Volume Overview */}
        <motion.div variants={itemVars} className="md:col-span-8 md:row-span-2 bg-[#1a1a1a] border border-[#484847]/40 rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <p className="font-label text-[10px] tracking-widest text-[#adaaaa] uppercase mb-1">Weekly Volume</p>
            <h3 className="font-headline text-3xl font-black text-white tracking-tighter">
              {animatedVolume.toLocaleString()} KG
            </h3>
          </div>
          <div className="mt-4 -ml-4 h-[120px] md:h-full w-[calc(100%+1rem)]">
            <WeeklyVolumeBar data={analytics?.volume_data || []} height={120} />
          </div>
        </motion.div>

        {/* 2. Streak Counter */}
        <motion.div variants={itemVars} className="md:col-span-4 md:row-span-1 bg-[#1a1a1a] border border-[#484847]/40 rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
          <span className="material-symbols-filled absolute top-[-20%] left-[-10%] text-[180px] text-[#ff7168]/10 select-none">local_fire_department</span>
          <div className="relative z-10 flex flex-col items-center text-[#ff7168]">
            <span className="material-symbols-filled text-3xl mb-1">local_fire_department</span>
            <span className="font-headline font-black text-6xl tracking-tighter leading-none">{animatedStreak}</span>
            <span className="font-headline font-bold text-xs tracking-widest uppercase mt-1 text-white">DAY STREAK</span>
          </div>
        </motion.div>

        {/* 3. PRs This Week */}
        <motion.div variants={itemVars} className="md:col-span-4 md:row-span-2 bg-[#1a1a1a] border border-[#484847]/40 rounded-3xl p-5 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <p className="font-label text-[10px] tracking-widest text-[#adaaaa] uppercase">Confirmed PRs</p>
            <span className="material-symbols-filled text-[#cafd00] text-sm">trophy</span>
          </div>
          <div className="space-y-2.5 flex-1 overflow-y-auto min-h-0 custom-scrollbar">
            {analytics?.recent_prs?.map((pr: any) => (
              <div key={pr.id} className="border-l-2 border-[#cafd00] pl-3 py-1.5">
                <p className="font-headline font-bold text-sm text-white uppercase leading-tight truncate pr-1">{pr.exercise}</p>
                <p className="font-label text-xs font-semibold text-[#cafd00] mt-0.5">{pr.metric}</p>
                <p className="font-body text-[10px] text-[#adaaaa]">{pr.date}</p>
              </div>
            ))}
            {!analytics?.recent_prs?.length && (
              <p className="text-[#adaaaa] font-body text-xs italic mt-2">No PRs locked this week.</p>
            )}
          </div>
        </motion.div>

        {/* 4. Recovery Score */}
        <motion.div variants={itemVars} className="md:col-span-4 md:row-span-1 bg-[#1a1a1a] border border-[#484847]/40 rounded-3xl p-4 flex flex-col items-center justify-center">
          <RecoveryRing percentage={analytics?.recovery_score || 0} size={100} label="Recovery" />
        </motion.div>

        {/* 5. Muscle Heatmap */}
        <motion.div variants={itemVars} className="md:col-span-8 md:row-span-1 bg-[#1a1a1a] border border-[#484847]/40 rounded-3xl p-5 relative overflow-hidden flex items-center justify-between gap-4">
          <div className="z-10 flex-shrink-0">
            <p className="font-label text-[10px] tracking-widest text-[#adaaaa] uppercase mb-3">Tactical Heatmap</p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-sm bg-[#cafd00] shadow-[0_0_6px_#cafd00]" />
                <span className="text-[10px] text-white uppercase font-label tracking-wider">Actioned (Today)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-sm bg-[#4d6100]" />
                <span className="text-[10px] text-white uppercase font-label tracking-wider">Actioned (48hr)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-sm bg-[#2a2a2a] border border-[#484847]/60" />
                <span className="text-[10px] text-[#adaaaa] uppercase font-label tracking-wider">No Target</span>
              </div>
            </div>
          </div>

          {/* Muscle Heatmap Image with region overlays */}
          <div className="flex-shrink-0 relative rounded-xl overflow-hidden"
               style={{ width: 120, height: 100 }}>
            <img
              src="/muscle-heatmap.png"
              alt="Back musculature"
              className="absolute inset-0 w-full h-full object-cover object-top"
              style={{ filter: 'brightness(0.85) contrast(1.1) saturate(0.9)' }}
            />
            {/*
              SVG overlay — viewBox matches the image's natural proportions (600×498).
              Each shape covers the correct anatomical region.
              mix-blend-mode: screen makes lime glow on dark muscle texture.
            */}
            <svg
              viewBox="0 0 600 498"
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ mixBlendMode: 'screen' }}
            >
              {/* ── Trapezius — maps to 'back' ── */}
              <ellipse
                cx="300" cy="148" rx="105" ry="72"
                fill={getOverlayColor(analytics?.muscle_heatmap?.back)}
                opacity={getOverlayOpacity(analytics?.muscle_heatmap?.back)}
              />

              {/* ── Left Rear Deltoid — maps to 'arms' ── */}
              <ellipse
                cx="132" cy="192" rx="62" ry="58"
                fill={getOverlayColor(analytics?.muscle_heatmap?.arms)}
                opacity={getOverlayOpacity(analytics?.muscle_heatmap?.arms)}
              />

              {/* ── Right Rear Deltoid — maps to 'arms' ── */}
              <ellipse
                cx="468" cy="192" rx="62" ry="58"
                fill={getOverlayColor(analytics?.muscle_heatmap?.arms)}
                opacity={getOverlayOpacity(analytics?.muscle_heatmap?.arms)}
              />

              {/* ── Left Lat (Latissimus Dorsi) — maps to 'back' ── */}
              <path
                d="M78,228 Q130,212 202,232 Q185,355 128,378 Q80,348 72,288 Z"
                fill={getOverlayColor(analytics?.muscle_heatmap?.back)}
                opacity={getOverlayOpacity(analytics?.muscle_heatmap?.back)}
              />

              {/* ── Right Lat (Latissimus Dorsi) — maps to 'back' ── */}
              <path
                d="M522,228 Q470,212 398,232 Q415,355 472,378 Q520,348 528,288 Z"
                fill={getOverlayColor(analytics?.muscle_heatmap?.back)}
                opacity={getOverlayOpacity(analytics?.muscle_heatmap?.back)}
              />

              {/* ── Spinal Erectors / Core — maps to 'core' ── */}
              <ellipse
                cx="300" cy="318" rx="48" ry="88"
                fill={getOverlayColor(analytics?.muscle_heatmap?.core)}
                opacity={getOverlayOpacity(analytics?.muscle_heatmap?.core)}
              />

              {/* ── Glutes — maps to 'legs' ── */}
              <ellipse
                cx="300" cy="440" rx="125" ry="52"
                fill={getOverlayColor(analytics?.muscle_heatmap?.legs)}
                opacity={getOverlayOpacity(analytics?.muscle_heatmap?.legs)}
              />

              {/* ── Left Tricep / Upper Arm — maps to 'arms' ── */}
              <ellipse
                cx="90" cy="285" rx="38" ry="65"
                fill={getOverlayColor(analytics?.muscle_heatmap?.arms)}
                opacity={getOverlayOpacity(analytics?.muscle_heatmap?.arms) * 0.7}
              />

              {/* ── Right Tricep / Upper Arm — maps to 'arms' ── */}
              <ellipse
                cx="510" cy="285" rx="38" ry="65"
                fill={getOverlayColor(analytics?.muscle_heatmap?.arms)}
                opacity={getOverlayOpacity(analytics?.muscle_heatmap?.arms) * 0.7}
              />
            </svg>
          </div>
        </motion.div>

        {/* 6. Next Session CTA */}
        <motion.div variants={itemVars} className="md:col-span-12 md:row-span-1">
          <div className="relative p-[1px] rounded-3xl overflow-hidden h-full group bg-gradient-to-r from-[#484847] via-[#cafd00]/30 to-[#484847]">
            <div className="absolute inset-0 bg-[#0e0e0e] m-[1px] rounded-[23px] z-0" />
            <div className="relative z-10 w-full h-full p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <p className="font-label text-[10px] tracking-widest text-[#cafd00] uppercase mb-1">Next Pending Session</p>
                <h3 className="font-headline text-2xl font-black text-white tracking-tighter uppercase">{analytics?.next_protocol || 'AWAITING DISPATCH'}</h3>
              </div>
              <Link to="/workout/active">
                <Button className="shrink-0 w-full md:w-auto hover:bg-white transition-colors" icon="play_arrow">INITIATE SESSION</Button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* 7. Community Leaderboard */}
        <motion.div variants={itemVars} className="md:col-span-6 md:row-span-2 bg-[#1a1a1a] border border-[#484847]/40 rounded-3xl p-5 overflow-hidden">
          <p className="font-label text-[10px] tracking-widest text-[#adaaaa] uppercase mb-4">Vanguard Leaderboard</p>
          <div className="space-y-3">
            {analytics?.leaderboard?.slice(0, 3).map((l: any, i: number) => (
              <div key={l.id} className="flex items-center gap-2 min-w-0">
                {/* Rank */}
                <span className={`font-headline font-black text-lg w-5 flex-shrink-0 ${i === 0 ? 'text-[#cafd00]' : 'text-[#484847]'}`}>
                  {i + 1}
                </span>
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <Avatar src={l.avatar} name={l.name} size="sm" />
                </div>
                {/* Name — truncates if too long */}
                <span className={`font-headline font-bold text-sm tracking-wider uppercase truncate flex-1 min-w-0 ${i === 0 ? 'text-white' : 'text-[#adaaaa]'}`}>
                  {l.name}
                </span>
                {/* Volume — never shrinks */}
                <span className="font-label text-xs font-bold text-[#cafd00] flex-shrink-0 ml-1">
                  {l.volume}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* 8. Signal Feed Preview */}
        <motion.div variants={itemVars} className="md:col-span-6 md:row-span-2 bg-[#1a1a1a] border border-[#484847]/40 rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="font-label text-[10px] tracking-widest text-[#adaaaa] uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff7168] animate-pulse block" />
                Intercom Signals
              </p>
              {unreadCount > 0 && <Badge variant="warning">{unreadCount} UNREAD</Badge>}
            </div>
            
            <div className="space-y-3">
              {notifications.slice(0, 2).map((n) => (
                <div key={n.id} className="bg-[#262626] rounded-xl p-3 border border-[#484847]/30">
                  <p className="font-headline font-bold text-xs text-white uppercase">{n.title}</p>
                  <p className="font-body text-xs text-[#adaaaa] truncate mt-0.5">{n.body}</p>
                </div>
              ))}
              {notifications.length === 0 && (
                <p className="text-[#adaaaa] font-body text-xs italic mt-2">Comms channel is silent.</p>
              )}
            </div>
          </div>
          
          <Link to="/signals" className="mt-4 block w-full">
            <Button variant="outline" size="sm" fullWidth className="text-[10px] !bg-[#262626] hover:!bg-[#484847] !border-none text-white">VIEW ALL SIGNALS →</Button>
          </Link>
        </motion.div>

      </motion.div>
    </div>
  )
}
