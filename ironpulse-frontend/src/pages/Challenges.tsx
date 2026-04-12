import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/client'
import { useAuthStore } from '../store/authStore'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Skeleton from '../components/ui/Skeleton'

const MOCK_CHALLENGES = [
  {
    id: '1', title: '100 Push-Up Blitz', description: 'Complete 100 push-ups in a single session without rest between sets exceeding 90 seconds.', exercise: 'Push-Up', target_reps: 100,
    creator: { display_name: 'IRON_WOLF', avatar_url: null }, participant_count: 47, deadline: '2026-04-18', difficulty: 'INTERMEDIATE', joined: false, status: 'active'
  },
  {
    id: '2', title: '5-Plate Deadlift Club', description: 'Pull 225kg (5 plates) for a single clean rep. Judged by video submission.', exercise: 'Deadlift', target_weight_kg: 225,
    creator: { display_name: 'TITAN_89', avatar_url: null }, participant_count: 12, deadline: '2026-04-30', difficulty: 'OPERATOR', joined: true, status: 'active'
  },
  {
    id: '3', title: 'Squat Every Day — 7 Days', description: 'Hit at least one working squat set every day for 7 consecutive days. Log each session.', exercise: 'Squat', target_days: 7,
    creator: { display_name: 'QUAD_COMMANDER', avatar_url: null }, participant_count: 203, deadline: '2026-04-17', difficulty: 'RECRUIT', joined: false, status: 'active'
  },
  {
    id: '4', title: '1000kg Weekly Volume', description: 'Accumulate 1,000kg of total weekly training volume across all compound lifts.', exercise: 'Multiple', target_volume_kg: 1000,
    creator: { display_name: 'SYSTEM_ADMIN', avatar_url: null }, participant_count: 88, deadline: '2026-04-21', difficulty: 'INTERMEDIATE', joined: true, status: 'active'
  },
]

const difficultyVariant: Record<string, 'warning' | 'error' | 'default'> = {
  OPERATOR: 'error',
  INTERMEDIATE: 'warning',
  RECRUIT: 'default',
}

export default function Challenges() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'active' | 'mine'>('active')

  const { data: challenges, isLoading } = useQuery({
    queryKey: ['challenges'],
    queryFn: async () => {
      try {
        const res = await api.get('/challenges')
        return res.data
      } catch {
        return MOCK_CHALLENGES
      }
    }
  })

  const handleJoin = async (challengeId: string, joined: boolean) => {
    try {
      if (joined) {
        await api.delete(`/challenges/${challengeId}/join`)
      } else {
        await api.post(`/challenges/${challengeId}/join`)
      }
      queryClient.invalidateQueries({ queryKey: ['challenges'] })
    } catch {
      // optimistic update already shown by mock
    }
  }

  const displayed = (challenges || []).filter((c: any) =>
    tab === 'mine' ? c.joined : true
  )

  const daysLeft = (deadline: string) => {
    const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
    return diff > 0 ? `${diff}D LEFT` : 'EXPIRED'
  }

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="font-headline text-4xl font-black text-white italic tracking-tighter uppercase leading-none">
          BATTLE<br/>CHALLENGES
        </h1>
        <p className="text-[#adaaaa] font-body text-xs mt-1">Compete. Prove. Dominate.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#1a1a1a] rounded-xl p-1 border border-[#484847]/40">
        {(['active', 'mine'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg font-headline font-bold text-xs uppercase tracking-widest transition-colors ${tab === t ? 'bg-[#cafd00] text-black' : 'text-[#adaaaa] hover:text-white'}`}
          >
            {t === 'active' ? 'ALL ACTIVE' : 'MY CHALLENGES'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} variant="card" className="h-40" />)}
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {displayed.map((c: any, i: number) => (
            <motion.div
              key={c.id}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ delay: i * 0.06 }}
              className="bg-[#1a1a1a] border border-[#484847]/40 rounded-3xl p-5 space-y-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={difficultyVariant[c.difficulty] || 'default'} className="!text-[8px]">{c.difficulty}</Badge>
                    <span className={`font-label text-[9px] font-bold tracking-widest uppercase ${daysLeft(c.deadline) === 'EXPIRED' ? 'text-[#ff7168]' : 'text-[#adaaaa]'}`}>
                      {daysLeft(c.deadline)}
                    </span>
                  </div>
                  <h3 className="font-headline font-black text-base uppercase tracking-tight text-white leading-tight">{c.title}</h3>
                </div>
                {c.joined && (
                  <span className="material-symbols-filled text-[#cafd00] text-xl shrink-0">verified</span>
                )}
              </div>

              <p className="text-[#adaaaa] font-body text-sm leading-relaxed">{c.description}</p>

              {/* Stats row */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Avatar src={c.creator?.avatar_url} name={c.creator?.display_name} size="xs" />
                  <span className="font-label text-[10px] uppercase tracking-widest text-[#adaaaa] font-bold">{c.creator?.display_name}</span>
                </div>
                <div className="flex items-center gap-1 ml-auto">
                  <span className="material-symbols-outlined text-[#484847] text-sm">group</span>
                  <span className="font-label text-[10px] tracking-widest text-[#adaaaa] font-bold">{c.participant_count} OPERATORS</span>
                </div>
              </div>

              <Button
                fullWidth
                variant={c.joined ? 'outline' : 'primary'}
                size="sm"
                onClick={() => handleJoin(c.id, c.joined)}
                className="!font-black !tracking-widest"
              >
                {c.joined ? 'WITHDRAW' : 'ACCEPT CHALLENGE'}
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      {!isLoading && displayed.length === 0 && (
        <div className="text-center py-20 space-y-3">
          <span className="material-symbols-outlined text-5xl text-[#484847]">bolt</span>
          <p className="font-headline text-lg font-black uppercase italic tracking-tighter text-[#484847]">NO ACTIVE CHALLENGES</p>
          <p className="text-[#adaaaa] font-body text-xs">Check back soon — new battles are posted weekly.</p>
        </div>
      )}
    </div>
  )
}
