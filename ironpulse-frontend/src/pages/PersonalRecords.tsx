import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import api from '../api/client'
import Skeleton from '../components/ui/Skeleton'

const MOCK_PRS = [
  { id: '1', exercise: 'Barbell Deadlift', weight_kg: 180, reps: 3, estimated_1rm: 194, date: '2026-04-09T08:30:00Z', improvement_kg: 5 },
  { id: '2', exercise: 'Barbell Bench Press', weight_kg: 100, reps: 5, estimated_1rm: 112, date: '2026-04-08T07:00:00Z', improvement_kg: 2.5 },
  { id: '3', exercise: 'Barbell Back Squat', weight_kg: 140, reps: 5, estimated_1rm: 157, date: '2026-04-06T07:15:00Z', improvement_kg: 5 },
  { id: '4', exercise: 'Overhead Press', weight_kg: 70, reps: 4, estimated_1rm: 77, date: '2026-04-03T06:45:00Z', improvement_kg: 2.5 },
  { id: '5', exercise: 'Pull-Up', weight_kg: 20, reps: 8, estimated_1rm: 36, date: '2026-03-29T08:00:00Z', improvement_kg: 5 },
  { id: '6', exercise: 'Romanian Deadlift', weight_kg: 120, reps: 8, estimated_1rm: 142, date: '2026-03-24T07:30:00Z', improvement_kg: 10 },
]

const SORT_OPTIONS = ['RECENT', 'HEAVIEST', 'BIGGEST JUMP']

export default function PersonalRecords() {
  const [sort, setSort] = useState('RECENT')

  const { data: prs, isLoading } = useQuery({
    queryKey: ['personalRecords'],
    queryFn: async () => {
      try {
        const res = await api.get('/users/me/prs')
        return res.data
      } catch {
        return MOCK_PRS
      }
    }
  })

  const sorted = [...(prs || [])].sort((a: any, b: any) => {
    if (sort === 'HEAVIEST') return b.weight_kg - a.weight_kg
    if (sort === 'BIGGEST JUMP') return b.improvement_kg - a.improvement_kg
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })

  const totalPRs = (prs || []).length
  const totalWeight = (prs || []).reduce((s: number, p: any) => s + p.weight_kg, 0)
  const biggestPR = (prs || []).reduce((max: any, p: any) => (!max || p.weight_kg > max.weight_kg ? p : max), null)

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="font-headline text-4xl font-black text-white italic tracking-tighter uppercase leading-none">
          PERSONAL<br/>RECORDS
        </h1>
        <p className="text-[#adaaaa] font-body text-xs mt-1">Every PR locked and confirmed.</p>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'TOTAL PRs', value: totalPRs, icon: 'trophy' },
          { label: 'HEAVIEST', value: biggestPR ? `${biggestPR.weight_kg}kg` : '—', icon: 'fitness_center' },
          { label: 'TOP LIFT', value: biggestPR?.exercise?.split(' ').pop() || '—', icon: 'military_tech' },
        ].map(tile => (
          <div key={tile.label} className="bg-[#1a1a1a] border border-[#484847]/40 rounded-2xl p-3 flex flex-col items-center text-center gap-1">
            <span className="material-symbols-filled text-[#cafd00] text-xl">{tile.icon}</span>
            <span className="font-headline font-black text-lg text-white leading-none">{tile.value}</span>
            <span className="font-label text-[8px] tracking-widest text-[#adaaaa] uppercase font-bold">{tile.label}</span>
          </div>
        ))}
      </div>

      {/* Sort */}
      <div className="flex gap-2">
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt}
            onClick={() => setSort(opt)}
            className={`px-3 py-1.5 rounded-lg font-headline font-bold text-[10px] tracking-widest uppercase transition-colors ${sort === opt ? 'bg-[#cafd00] text-black' : 'bg-[#1a1a1a] text-[#adaaaa] border border-[#484847]/50'}`}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* PR List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} variant="card" className="h-24" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((pr: any, i: number) => (
            <motion.div
              key={pr.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-[#1a1a1a] border border-[#484847]/40 rounded-2xl p-4 flex items-center gap-4"
            >
              {/* Rank */}
              <span className={`font-headline font-black text-2xl w-8 shrink-0 ${i === 0 ? 'text-[#cafd00]' : 'text-[#484847]'}`}>
                {i + 1}
              </span>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-headline font-bold text-sm uppercase tracking-wider text-white truncate">{pr.exercise}</h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-headline font-black text-[#cafd00] text-base">{pr.weight_kg}kg × {pr.reps}</span>
                  <span className="font-label text-[9px] tracking-widest text-[#adaaaa] uppercase font-bold">
                    ~{pr.estimated_1rm}kg 1RM
                  </span>
                </div>
              </div>

              {/* Right */}
              <div className="flex flex-col items-end gap-1 shrink-0">
                <div className="flex items-center gap-1 bg-[#cafd00]/10 border border-[#cafd00]/20 px-2 py-0.5 rounded-full">
                  <span className="material-symbols-filled text-[#cafd00] text-[12px]">trending_up</span>
                  <span className="font-label text-[9px] font-bold text-[#cafd00] tracking-widest">+{pr.improvement_kg}kg</span>
                </div>
                <span className="font-body text-[10px] text-[#adaaaa]">
                  {format(new Date(pr.date), 'MMM d')}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {!isLoading && sorted.length === 0 && (
        <div className="text-center py-20 space-y-3">
          <span className="material-symbols-outlined text-5xl text-[#484847]">emoji_events</span>
          <p className="font-headline text-lg font-black uppercase italic tracking-tighter text-[#484847]">NO PRs YET</p>
          <p className="text-[#adaaaa] font-body text-xs">Start training — your first PR is waiting.</p>
        </div>
      )}
    </div>
  )
}
