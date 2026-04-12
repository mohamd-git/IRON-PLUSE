import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '../api/client'
import { useAuthStore } from '../store/authStore'
import TopHeader from '../components/layout/TopHeader'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Skeleton from '../components/ui/Skeleton'

const MOCK_USER = {
  id: 'u1',
  display_name: 'IRON_WOLF',
  username: 'iron_wolf',
  avatar_url: null,
  role: 'user',
  experience_level: 'OPERATOR',
  primary_goal: 'STRENGTH',
  current_streak: 14,
  longest_streak: 42,
  total_sessions: 187,
  total_volume_kg: 248000,
  joined: '2024-01-10T00:00:00Z',
  recent_prs: [
    { exercise: 'Deadlift', metric: '200kg × 2' },
    { exercise: 'Squat', metric: '160kg × 5' },
    { exercise: 'Bench', metric: '120kg × 3' },
  ]
}

export default function Profile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: me } = useAuthStore()
  const isOwnProfile = !id || id === me?.id

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', id || me?.id],
    queryFn: async () => {
      try {
        const endpoint = isOwnProfile ? '/users/me' : `/users/${id}`
        const res = await api.get(endpoint)
        return res.data
      } catch {
        return { ...MOCK_USER, display_name: isOwnProfile ? (me?.display_name || 'OPERATOR') : MOCK_USER.display_name }
      }
    }
  })

  if (isLoading) {
    return (
      <div className="bg-[#0e0e0e] min-h-screen pb-24">
        <TopHeader showBack title="OPERATOR FILE" />
        <div className="pt-20 px-6 space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton variant="card" className="w-20 h-20 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" className="h-6 w-40" />
              <Skeleton variant="text" className="h-3 w-24" />
            </div>
          </div>
          <Skeleton variant="card" className="h-28" />
          <Skeleton variant="card" className="h-40" />
        </div>
      </div>
    )
  }

  const stats = [
    { label: 'Sessions', value: profile?.total_sessions || 0, icon: 'fitness_center' },
    { label: 'Streak', value: `${profile?.current_streak || 0}D`, icon: 'local_fire_department' },
    { label: 'Best Streak', value: `${profile?.longest_streak || 0}D`, icon: 'military_tech' },
    { label: 'Volume', value: profile?.total_volume_kg ? `${Math.round(profile.total_volume_kg / 1000)}T` : '—', icon: 'monitoring' },
  ]

  return (
    <div className="bg-[#0e0e0e] min-h-screen text-white pb-24">
      <TopHeader showBack showDesktopNav={false} />

      <div className="w-full max-w-lg mx-auto pt-20 px-6 space-y-6">
        {/* Identity */}
        <div className="flex items-center gap-5">
          <Avatar src={profile?.avatar_url} name={profile?.display_name} size="xl" className="w-20 h-20" />
          <div className="flex-1">
            <h1 className="font-headline font-black text-2xl uppercase tracking-tighter text-white leading-none">
              {profile?.display_name}
            </h1>
            <p className="text-[#adaaaa] font-body text-sm mt-0.5">@{profile?.username}</p>
            <div className="flex gap-2 mt-2">
              {profile?.role === 'vip' && <Badge variant="vip">VIP</Badge>}
              <Badge variant="warning" className="!text-[9px]">{profile?.experience_level || 'OPERATOR'}</Badge>
            </div>
          </div>

          {isOwnProfile ? (
            <Button variant="outline" size="sm" onClick={() => navigate('/settings')} className="!px-3 shrink-0">
              <span className="material-symbols-outlined text-sm">edit</span>
            </Button>
          ) : (
            <Button size="sm" onClick={() => navigate(`/comms/${profile?.id}`)} className="!px-3 shrink-0">
              <span className="material-symbols-outlined text-sm">send</span>
            </Button>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2">
          {stats.map(s => (
            <div key={s.label} className="bg-[#1a1a1a] border border-[#484847]/40 rounded-2xl p-3 flex flex-col items-center text-center gap-1">
              <span className="material-symbols-filled text-[#cafd00] text-lg">{s.icon}</span>
              <span className="font-headline font-black text-base text-white leading-none">{s.value}</span>
              <span className="font-label text-[8px] tracking-widest text-[#adaaaa] uppercase">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Goal */}
        <div className="bg-[#1a1a1a] border border-[#484847]/40 rounded-2xl p-4 flex items-center gap-4">
          <span className="material-symbols-filled text-[#cafd00] text-2xl">track_changes</span>
          <div>
            <p className="font-label text-[9px] tracking-widest text-[#adaaaa] uppercase font-bold">Primary Objective</p>
            <p className="font-headline font-black text-sm uppercase text-white tracking-wider mt-0.5">{profile?.primary_goal || 'UNSET'}</p>
          </div>
        </div>

        {/* Recent PRs */}
        {profile?.recent_prs?.length > 0 && (
          <div>
            <h3 className="font-label text-[10px] font-bold tracking-widest text-[#adaaaa] uppercase border-b border-[#484847]/40 pb-2 mb-4">CONFIRMED PRs</h3>
            <div className="space-y-2">
              {profile.recent_prs.map((pr: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center justify-between bg-[#1a1a1a] border border-[#484847]/30 rounded-xl p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-filled text-[#cafd00] text-lg">trophy</span>
                    <span className="font-headline font-bold text-sm uppercase text-white">{pr.exercise}</span>
                  </div>
                  <span className="font-label text-xs font-bold text-[#cafd00] tracking-widest">{pr.metric}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Challenge button for other profiles */}
        {!isOwnProfile && (
          <Button fullWidth icon="bolt" onClick={() => navigate('/challenges')}>
            SEND CHALLENGE
          </Button>
        )}
      </div>
    </div>
  )
}
