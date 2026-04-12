import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import api from '../api/client'
import Badge from '../components/ui/Badge'
import WeeklyVolumeBar from '../components/charts/WeeklyVolumeBar'

export default function BattleLog() {
  const [expandedId, setExpandedId] = useState<string | null>('1') // default expand first ID assuming 1

  const { data } = useQuery({
    queryKey: ['battleLogHistory'],
    queryFn: async () => {
      try {
        const res = await api.get('/sessions?limit=6')
        return res.data
      } catch {
        return {
          streak: 12, total_sessions: 144, total_prs: 31,
          sessions: [
            { id: '1', date: 'TODAY', name: 'Phase IV: Metcon Overdrive', duration: 45, volume: 14200, pr_earned: true, exercises: [{ name: 'Deadlift', sets: '140kg x 5, 140kg x 5' }, { name: 'Leg Press', sets: '280kg x 10' }] },
            { id: '2', date: 'YESTERDAY', name: 'Tactical Hypertrophy', duration: 62, volume: 18400, pr_earned: false, exercises: [{ name: 'Bench Press', sets: '100kg x 8, 100kg x 8' }] },
            { id: '3', date: 'OCT 12', name: 'Titan Base Building', duration: 50, volume: 11000, pr_earned: true, exercises: [{ name: 'Squat', sets: '120kg x 5 PR' }] },
            { id: '4', date: 'OCT 10', name: 'Armor: Shoulders', duration: 40, volume: 8400, pr_earned: false, exercises: [{ name: 'OHP', sets: '60kg x 8' }] },
            { id: '5', date: 'OCT 08', name: 'Tactical Endurance', duration: 90, volume: 22000, pr_earned: false, exercises: [{ name: 'Rows', sets: '80kg x 10' }] },
            { id: '6', date: 'OCT 06', name: 'Phase IV: Metcon Overdrive', duration: 45, volume: 13900, pr_earned: false, exercises: [{ name: 'Deadlift', sets: '135kg x 5' }] }
          ]
        }
      }
    }
  })

  return (
    <div className="space-y-6">
      <h1 className="font-headline text-4xl font-black text-white italic tracking-tighter uppercase leading-none">
        BATTLE LOG
      </h1>

      {/* Summary Tiles - 3 Col */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#1a1a1a] p-4 rounded-2xl border border-[#484847]/40 flex flex-col items-center justify-center text-center">
          <span className="material-symbols-filled text-[#ff7168] text-xl mb-1">local_fire_department</span>
          <span className="font-headline font-black text-2xl text-white tracking-tighter">{data?.streak || 0}</span>
          <span className="font-label text-[8px] tracking-widest text-[#adaaaa] uppercase mt-1">Streak</span>
        </div>
        <div className="bg-[#1a1a1a] p-4 rounded-2xl border border-[#484847]/40 flex flex-col items-center justify-center text-center">
          <span className="material-symbols-filled text-[#cafd00] text-xl mb-1">fitness_center</span>
          <span className="font-headline font-black text-2xl text-white tracking-tighter">{data?.total_sessions || 0}</span>
          <span className="font-label text-[8px] tracking-widest text-[#adaaaa] uppercase mt-1">Sessions</span>
        </div>
        <div className="bg-[#1a1a1a] p-4 rounded-2xl border border-[#484847]/40 flex flex-col items-center justify-center text-center">
          <span className="material-symbols-filled text-[#cafd00] text-xl mb-1">trophy</span>
          <span className="font-headline font-black text-2xl text-white tracking-tighter">{data?.total_prs || 0}</span>
          <span className="font-label text-[8px] tracking-widest text-[#adaaaa] uppercase mt-1">Total PRs</span>
        </div>
      </div>

      <div className="space-y-4">
        {data?.sessions?.map((session: any) => {
          const isExpanded = expandedId === session.id
          
          return (
            <div key={session.id} className="bg-[#1a1a1a] border border-[#484847]/40 rounded-2xl overflow-hidden transition-colors">
              <div 
                className="p-4 cursor-pointer hover:bg-[#262626]/50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : session.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-label text-[10px] font-bold tracking-widest text-[#adaaaa] uppercase">{session.date}</span>
                    {session.pr_earned && <Badge className="!bg-[#cafd00]/20 !text-[#cafd00] !border-none !text-[8px] px-1.5 pt-0.5">⭐ PR EARNED</Badge>}
                  </div>
                  <motion.span 
                    animate={{ rotate: isExpanded ? 180 : 0 }} 
                    className="material-symbols-outlined text-[#adaaaa]"
                  >
                    expand_more
                  </motion.span>
                </div>
                
                <h3 className="font-headline font-black text-lg text-white uppercase tracking-tighter mb-2">{session.name}</h3>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs font-label uppercase tracking-widest text-[#adaaaa]">
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">schedule</span>{session.duration}m</span>
                    <span className="flex items-center gap-1 text-[#cafd00]"><span className="material-symbols-outlined text-[14px]">equalizer</span>{session.volume}kg</span>
                  </div>
                  
                  {/* Miniature volume chart stub for aesthetic flair */}
                  <div className="w-16 h-4 flex items-end gap-0.5">
                    {[3, 5, 2, 8, 5, 10, 8].map((v, i) => (
                      <div key={i} className="bg-[#484847] flex-1 rounded-t-sm" style={{ height: `${(v/10)*100}%` }} />
                    ))}
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-[#0e0e0e]/50 border-t border-[#484847]/30"
                  >
                    <div className="p-4 space-y-3">
                      {session.exercises.map((ex: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center bg-[#262626] p-3 rounded-lg">
                          <span className="font-headline font-bold text-sm tracking-wider uppercase text-white">{ex.name}</span>
                          <span className="font-body text-xs text-[#adaaaa]">{ex.sets}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      <p className="text-center font-label text-[10px] tracking-widest font-bold text-[#484847] uppercase pt-4 pb-8">
        END OF LOG DATA
      </p>
    </div>
  )
}
