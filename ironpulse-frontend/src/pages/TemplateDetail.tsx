import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '../api/client'
import TopHeader from '../components/layout/TopHeader'
import Skeleton from '../components/ui/Skeleton'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'

const MOCK_TEMPLATE = {
  id: 't1',
  name: 'Hypertrophy Block A',
  description: 'A structured 4-day hypertrophy program built around progressive overload. Designed for intermediate operators seeking maximal muscle adaptation through controlled volume escalation.',
  difficulty: 'INTERMEDIATE',
  duration_weeks: 8,
  days_per_week: 4,
  category: 'HYPERTROPHY',
  image_url: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=1000&q=80',
  trainer: { name: 'COACH STEELE', avatar: null, speciality: 'Strength & Hypertrophy' },
  exercises: [
    { day: 'DAY A — PUSH', movements: ['Barbell Bench Press 4×8', 'Incline Dumbbell Press 3×10', 'Overhead Press 3×10', 'Lateral Raise 4×15', 'Tricep Pushdown 3×12'] },
    { day: 'DAY B — PULL', movements: ['Barbell Deadlift 4×5', 'Weighted Pull-Up 4×6', 'Cable Row 3×10', 'Face Pull 3×15', 'Barbell Curl 3×10'] },
    { day: 'DAY C — LEGS', movements: ['Barbell Back Squat 4×8', 'Romanian Deadlift 3×10', 'Leg Press 3×12', 'Walking Lunges 3×20', 'Calf Raise 4×15'] },
    { day: 'DAY D — ARMS & CORE', movements: ['Dumbbell Curl 4×12', 'Hammer Curl 3×12', 'Skull Crusher 3×12', 'Dips 3×10', 'Plank 3×60s'] },
  ],
  stats: { enrolled: 1240, avg_rating: 4.8, completion_rate: 71 }
}

export default function TemplateDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: template, isLoading } = useQuery({
    queryKey: ['template', id],
    queryFn: async () => {
      try {
        const res = await api.get(`/templates/${id}`)
        return res.data
      } catch {
        return MOCK_TEMPLATE
      }
    }
  })

  if (isLoading) {
    return (
      <div className="bg-[#0e0e0e] min-h-screen pb-32">
        <TopHeader showBack title="PROTOCOL" />
        <div className="pt-16"><Skeleton variant="card" className="h-[30vh] rounded-none" /></div>
        <div className="p-6 space-y-4">
          <Skeleton variant="text" className="h-8 w-3/4" />
          <Skeleton variant="text" className="h-4 w-full" />
          <Skeleton variant="card" className="h-40" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#0e0e0e] min-h-screen text-white relative flex flex-col">
      <TopHeader showBack showDesktopNav={false} />

      <main className="flex-1 pb-28 pt-16 w-full max-w-lg mx-auto">
        {/* Hero */}
        <div className="relative aspect-video w-full overflow-hidden bg-[#1a1a1a]">
          <img src={template?.image_url} alt={template?.name} className="w-full h-full object-cover grayscale opacity-60 mix-blend-luminosity" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-[#0e0e0e]/30 to-transparent" />
          <div className="absolute bottom-4 px-6 w-full">
            <h1 className="text-3xl font-black font-headline uppercase italic tracking-tighter leading-none mb-2">
              {template?.name}
            </h1>
            <div className="flex gap-2">
              <Badge variant="warning">{template?.difficulty}</Badge>
              <Badge className="bg-[#262626] text-white border-none">{template?.duration_weeks} WEEKS</Badge>
              <Badge className="bg-[#262626] text-white border-none">{template?.days_per_week}×/WEEK</Badge>
            </div>
          </div>
        </div>

        <div className="px-6 mt-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Enrolled', value: template?.stats?.enrolled?.toLocaleString() },
              { label: 'Rating', value: `${template?.stats?.avg_rating}★` },
              { label: 'Completion', value: `${template?.stats?.completion_rate}%` },
            ].map(s => (
              <div key={s.label} className="bg-[#1a1a1a] border border-[#484847]/40 rounded-2xl p-3 text-center">
                <p className="font-headline font-black text-xl text-[#cafd00]">{s.value}</p>
                <p className="font-label text-[9px] tracking-widest text-[#adaaaa] uppercase mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Description */}
          <p className="text-[#adaaaa] font-body text-sm leading-relaxed">{template?.description}</p>

          {/* Trainer */}
          {template?.trainer && (
            <div className="flex items-center gap-4 bg-[#1a1a1a] border border-[#484847]/40 rounded-2xl p-4">
              <div className="w-12 h-12 rounded-full bg-[#262626] border border-[#484847] flex items-center justify-center shrink-0">
                <span className="material-symbols-filled text-[#cafd00] text-xl">person</span>
              </div>
              <div>
                <p className="font-headline font-bold text-sm uppercase text-white">{template.trainer.name}</p>
                <p className="font-body text-xs text-[#adaaaa]">{template.trainer.speciality}</p>
              </div>
            </div>
          )}

          {/* Exercise schedule */}
          <div>
            <h3 className="font-label text-[10px] font-bold tracking-widest text-[#adaaaa] uppercase border-b border-[#484847]/40 pb-2 mb-4">WEEKLY STRUCTURE</h3>
            <div className="space-y-4">
              {template?.exercises?.map((day: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-[#1a1a1a] border border-[#484847]/30 rounded-2xl overflow-hidden"
                >
                  <div className="px-4 py-3 bg-[#262626] border-b border-[#484847]/30">
                    <h4 className="font-headline font-black text-xs uppercase tracking-widest text-[#cafd00]">{day.day}</h4>
                  </div>
                  <div className="p-4 space-y-2">
                    {day.movements.map((m: string, j: number) => (
                      <div key={j} className="flex items-center gap-3">
                        <span className="material-symbols-filled text-[#cafd00]/40 text-[14px] shrink-0">radio_button_checked</span>
                        <span className="font-body text-sm text-white">{m}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* CTA */}
      <div className="fixed bottom-0 w-full max-w-lg left-1/2 -translate-x-1/2 bg-gradient-to-t from-[#0e0e0e] via-[#0e0e0e]/90 to-transparent pt-12 pb-6 px-6 z-40">
        <Button fullWidth icon="play_arrow" className="shadow-[0_0_20px_rgba(202,253,0,0.15)]" onClick={() => navigate('/workout/active', { state: { templateId: id, templateName: template?.name } })}>
          INITIATE PROTOCOL
        </Button>
      </div>
    </div>
  )
}
