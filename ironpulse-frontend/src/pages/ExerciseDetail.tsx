import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/client'

import TopHeader from '../components/layout/TopHeader'
import Skeleton from '../components/ui/Skeleton'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import WeeklyVolumeBar from '../components/charts/WeeklyVolumeBar'

const TABS = ['OVERVIEW', 'FORM GUIDE', 'HISTORY']

export default function ExerciseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('OVERVIEW')

  const { data: exercise, isLoading } = useQuery({
    queryKey: ['exercise', id],
    queryFn: async () => {
      try {
        const res = await api.get(`/exercises/${id}`)
        return res.data
      } catch (e) {
        // Mock fallback for UI testing
        return {
          id,
          name: 'Barbell Deadlift',
          description: 'A structural compound movement that requires pulling a loaded barbell off the floor to the hips, then lowering it back. Deep integration across the entire posterior chain.',
          difficulty: 'OPERATOR',
          equipment: 'Barbell',
          muscles: ['LATS', 'RHOMBOIDS', 'HAMSTRINGS', 'GLUTES', 'CORE'],
          form_steps: [
            'Maintain a natural foot stance with mid-foot directly under the bar.',
            'Hinge at the hips and tightly grip the bar outside the legs.',
            'Brace core heavily and pull “the slack” out of the bar before pushing the floor away.',
            'Lock out by driving hips forward to a perfectly stacked vertical posture.'
          ],
          image_url: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=1000&q=80'
        }
      }
    }
  })

  const { data: history } = useQuery({
    queryKey: ['exerciseHistory', id],
    queryFn: async () => {
      return {
        volumeData: [
          { day: 'W1', volume: 4500 },
          { day: 'W2', volume: 4800 },
          { day: 'W3', volume: 3900 },
          { day: 'W4', volume: 5100 },
          { day: 'W5', volume: 5500 },
          { day: 'W6', volume: 0 },
          { day: 'W7', volume: 6100 },
          { day: 'W8', volume: 6400 },
        ],
        sets: [
          { date: 'Yesterday', sets: '140kg × 5, 140kg × 5' },
          { date: 'Last Week', sets: '135kg × 5, 135kg × 5, 135kg × 5' },
          { date: '2 Weeks Ago', sets: '130kg × 5, 130kg × 8 (PR)' },
        ]
      }
    }
  })

  const handleAddToWorkout = () => {
    // Navigate strictly passing exercise state payload
    navigate('/workout/active', { state: { addExerciseId: exercise?.id, name: exercise?.name } })
  }

  if (isLoading) {
    return (
      <div className="bg-[#0e0e0e] min-h-screen pb-32">
        <TopHeader showBack title="PROTOCOL DETAIL" />
        <div className="pt-16"><Skeleton variant="card" className="h-[30vh] rounded-none" /></div>
      </div>
    )
  }

  return (
    <div className="bg-[#0e0e0e] min-h-screen text-white relative flex flex-col">
      <TopHeader showBack showDesktopNav={false} />
      
      <main className="flex-1 pb-28 pt-16 w-full max-w-lg mx-auto">
        {/* Cinematic Hero */}
        <div className="relative aspect-video w-full overflow-hidden bg-[#1a1a1a]">
          <img src={exercise?.image_url} alt={exercise?.name} className="w-full h-full object-cover grayscale opacity-70 mix-blend-luminosity" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-[#0e0e0e]/40 to-transparent" />
          <div className="absolute bottom-4 px-6 w-full">
            <h1 className="text-4xl md:text-5xl font-black font-headline uppercase italic tracking-tighter leading-none mb-3">
              {exercise?.name}
            </h1>
            <div className="flex flex-wrap gap-2">
              {exercise?.muscles?.map((m: string) => (
                <span key={m} className="px-2 py-1 rounded bg-[#262626] border border-[#484847] text-[10px] font-label tracking-widest uppercase text-[#cafd00]">
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 mt-6">
          {/* Custom Tab Bar */}
          <div className="flex items-center gap-6 border-b border-[#484847]/40">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 font-headline font-bold text-xs tracking-widest uppercase transition-colors relative ${activeTab === tab ? 'text-[#cafd00]' : 'text-[#adaaaa] hover:text-white'}`}
              >
                {tab}
                {activeTab === tab && (
                  <motion.div layoutId="tab-underline" className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-[#cafd00]" />
                )}
              </button>
            ))}
          </div>

          {/* Tab Views */}
          <div className="py-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {/* ── OVERVIEW ────────────────────────────────────────── */}
                {activeTab === 'OVERVIEW' && (
                  <div className="space-y-6">
                    <div className="flex gap-3">
                      <Badge variant="warning" className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">local_fire_department</span>{exercise?.difficulty}</Badge>
                      <Badge className="bg-[#262626] text-white border-none flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">fitness_center</span>{exercise?.equipment}</Badge>
                    </div>
                    
                    <p className="text-[#adaaaa] font-body text-sm leading-relaxed">
                      {exercise?.description}
                    </p>

                    <div>
                      <h4 className="font-label text-[10px] font-bold text-white tracking-widest uppercase mb-3 text-[#adaaaa] border-b border-[#484847]/40 pb-2">Primary Movers Activation</h4>
                      <div className="flex gap-2">
                        {exercise?.muscles?.slice(0, 3).map((m: string, i: number) => (
                          <div key={m} className={`flex-1 h-2 rounded-full ${i === 0 ? 'bg-[#cafd00]' : i === 1 ? 'bg-[#cafd00]/60' : 'bg-[#cafd00]/30'}`} title={m} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── FORM GUIDE ────────────────────────────────────────── */}
                {activeTab === 'FORM GUIDE' && (
                  <div className="space-y-4">
                    {exercise?.form_steps?.map((step: string, i: number) => (
                      <div key={i} className="flex gap-4 p-4 rounded-xl bg-[#1a1a1a] border border-[#484847]/30">
                        <span className="material-symbols-filled text-[#cafd00] shrink-0 mt-0.5">radio_button_checked</span>
                        <p className="text-white font-body text-sm leading-relaxed">{step}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── HISTORY ────────────────────────────────────────────── */}
                {activeTab === 'HISTORY' && (
                  <div className="space-y-8">
                    <div className="bg-[#1a1a1a] rounded-2xl border border-[#484847]/40 p-4">
                      <h4 className="font-label text-[10px] font-bold text-[#adaaaa] tracking-widest uppercase mb-4">8-Week Payload Transfer</h4>
                      <WeeklyVolumeBar data={history?.volumeData || []} height={140} />
                    </div>

                    <div>
                      <h4 className="font-label text-[10px] font-bold tracking-widest uppercase text-[#adaaaa] border-b border-[#484847]/40 pb-2 mb-4">Tactical Log</h4>
                      <div className="space-y-3">
                        {history?.sets?.map((log: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center bg-[#262626] p-3 rounded-lg">
                            <span className="font-body text-sm font-semibold text-white">{log.sets}</span>
                            <span className="font-label text-xs tracking-widest text-[#adaaaa] uppercase">{log.date}</span>
                          </div>
                        ))}
                        {!history?.sets && <p className="text-[#adaaaa] text-xs italic font-body">No previous mission data discovered.</p>}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Floating Bottom CTA */}
      <div className="fixed bottom-0 w-full max-w-lg left-1/2 -translate-x-1/2 bg-gradient-to-t from-[#0e0e0e] via-[#0e0e0e]/90 to-transparent pt-12 pb-6 px-6 z-40 border-t border-[#484847]/20">
        <Button fullWidth icon="add" className="shadow-[0_0_20px_rgba(202,253,0,0.15)]" onClick={handleAddToWorkout}>
          ADD TO ACTIVE WORKOUT
        </Button>
      </div>
    </div>
  )
}
