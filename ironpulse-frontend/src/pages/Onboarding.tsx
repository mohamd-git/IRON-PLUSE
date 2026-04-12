import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { PRIMARY_GOALS, EXPERIENCE_LEVELS } from '../utils/constants'
import { useAuthStore } from '../store/authStore'
import api from '../api/client'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { zIndex: 1, x: 0, opacity: 1 },
  exit: (dir: number) => ({ zIndex: 0, x: dir < 0 ? 300 : -300, opacity: 0 }),
}

const EQUIPMENT_OPTIONS = ['Barbell', 'Dumbbells', 'Cables', 'Smith Machine', 'Bodyweight Only']
const TIME_OPTIONS = ['DAWN', 'DAY', 'DUSK', 'NIGHT']

export default function Onboarding() {
  const navigate = useNavigate()
  const { user, setUser } = useAuthStore()

  // Routing State
  const [[page, direction], setPage] = useState([0, 0])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form State
  const [goal, setGoal] = useState<string | null>(null)
  
  const [unit, setUnit] = useState<'METRIC' | 'IMPERIAL'>('METRIC')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [experience, setExperience] = useState<string | null>(null)
  const [days, setDays] = useState(3)
  
  const [equipment, setEquipment] = useState<string[]>([])
  const [time, setTime] = useState<string | null>(null)

  const toggleEquipment = (eq: string) => {
    setEquipment(prev => prev.includes(eq) ? prev.filter(i => i !== eq) : [...prev, eq])
  }

  const handleUnitToggle = () => {
    if (unit === 'METRIC') {
      // Metric to Imperial
      setUnit('IMPERIAL')
      if (height) setHeight(Math.round(Number(height) / 30.48).toString()) // approx FT
      if (weight) setWeight(Math.round(Number(weight) * 2.20462).toString())
    } else {
      // Imperial to Metric
      setUnit('METRIC')
      if (height) setHeight(Math.round(Number(height) * 30.48).toString()) // approx CM
      if (weight) setWeight(Math.round(Number(weight) / 2.20462).toString())
    }
  }

  const navigatePage = (newDir: number) => {
    setPage([page + newDir, newDir])
  }

  const handleComplete = async () => {
    setIsSubmitting(true)
    try {
      // Normalize to metric for DB
      const h_cm = unit === 'METRIC' ? Number(height) : Number(height) * 30.48
      const w_kg = unit === 'METRIC' ? Number(weight) : Number(weight) / 2.20462

      const payload = {
        primary_goal: goal,
        height_cm: h_cm || null,
        weight_kg: w_kg || null,
        experience_level: experience,
        training_days_per_week: days,
        preferred_training_time: time,
        equipment: equipment,
        onboarding_complete: true
      }

      const res = await api.patch('/users/me', payload)
      setUser(res.data)
      navigate('/dashboard')
    } catch (err) {
      console.error(err)
      setIsSubmitting(false)
    }
  }

  // Common Header logic
  const renderDots = () => (
    <div className="flex justify-center gap-2 mb-8">
      {[0, 1, 2].map(idx => (
        <motion.div
          key={idx}
          layout
          initial={false}
          className={`h-2 rounded-full ${page === idx ? 'bg-[#cafd00] w-8' : 'bg-[#484847] w-2'}`}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      ))}
    </div>
  )

  return (
    <div className="relative min-h-screen bg-[#0e0e0e] overflow-hidden flex flex-col justify-between px-6 pt-16 pb-12">
      <div className="w-full max-w-sm mx-auto flex-1 flex flex-col">
        {renderDots()}

        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={page}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            className="flex-1 w-full flex flex-col"
          >
            {/* ── PHASE 1 ─────────────────────────────────────────── */}
            {page === 0 && (
              <div className="space-y-8 flex-1">
                <div className="relative h-48 rounded-2xl overflow-hidden bg-[#262626]">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                  <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop" alt="Gym" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute bottom-4 left-4 z-20">
                    <h2 className="font-headline text-3xl font-black text-white italic tracking-tighter uppercase">IDENTIFY<br/>YOUR WEAPON</h2>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {PRIMARY_GOALS.map(g => (
                    <motion.div
                      whileTap={{ scale: 0.95 }}
                      key={g.value}
                      onClick={() => setGoal(g.value)}
                      className={`cursor-pointer rounded-xl p-5 flex flex-col items-center justify-center gap-3 transition-colors ${
                        goal === g.value ? 'border-2 border-[#cafd00] bg-[#cafd00]/10' : 'bg-[#1a1a1a] border border-[#484847]/50'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-[32px] ${goal === g.value ? 'text-[#cafd00]' : 'text-white'}`}>{g.icon}</span>
                      <span className="font-headline font-bold text-xs tracking-widest uppercase text-center">{g.label}</span>
                    </motion.div>
                  ))}
                </div>
                
                <div className="mt-auto pt-8 pb-4">
                  <Button fullWidth disabled={!goal} onClick={() => navigatePage(1)}>NEXT PHASE →</Button>
                </div>
              </div>
            )}

            {/* ── PHASE 2 ─────────────────────────────────────────── */}
            {page === 1 && (
              <div className="space-y-8 flex-1">
                <div>
                  <h2 className="font-headline text-3xl font-black text-white italic tracking-tighter uppercase">CALIBRATE<br/>YOUR UNIT</h2>
                  <p className="text-[#adaaaa] font-body text-sm mt-2">Precision drives outperformance.</p>
                </div>

                <div className="space-y-6">
                  {/* Unit Toggle */}
                  <div className="flex justify-center">
                    <div className="flex bg-[#1a1a1a] border border-[#484847] p-1 rounded-lg">
                      <button onClick={handleUnitToggle} className={`px-4 py-1.5 text-xs font-label font-bold rounded-md transition-colors ${unit === 'METRIC' ? 'bg-[#cafd00] text-black' : 'text-[#adaaaa]'}`}>KG · CM</button>
                      <button onClick={handleUnitToggle} className={`px-4 py-1.5 text-xs font-label font-bold rounded-md transition-colors ${unit === 'IMPERIAL' ? 'bg-[#484847] text-white' : 'text-[#adaaaa]'}`}>LB · FT</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input label={`WEIGHT (${unit === 'METRIC' ? 'KG' : 'LB'})`} type="number" placeholder="00.0" value={weight} onChange={(e) => setWeight(e.target.value)} />
                    <Input label={`HEIGHT (${unit === 'METRIC' ? 'CM' : 'FT'})`} type="number" placeholder="000" value={height} onChange={(e) => setHeight(e.target.value)} />
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-label font-semibold tracking-wider text-white">EXPERIENCE LEVEL</label>
                    <div className="grid grid-cols-2 gap-2">
                      {EXPERIENCE_LEVELS.map(exp => (
                        <button
                          key={exp.value}
                          onClick={() => setExperience(exp.value)}
                          className={`py-3 px-2 rounded-lg text-xs font-headline font-bold tracking-widest uppercase transition-colors ${experience === exp.value ? 'bg-[#cafd00] text-black' : 'bg-[#1a1a1a] border border-[#484847] text-[#adaaaa]'}`}
                        >
                          {exp.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-label font-semibold tracking-wider text-white flex justify-between">TRAINING DAYS / WEEK <span className="text-[#cafd00]">{days}</span></label>
                    <div className="flex items-center justify-between bg-[#1a1a1a] border border-[#484847] rounded-xl p-2">
                      <button onClick={() => setDays(d => Math.max(d - 1, 1))} className="w-12 h-12 flex items-center justify-center rounded-lg bg-[#262626] text-white text-2xl hover:bg-[#484847] transition-colors">−</button>
                      <span className="font-headline font-black text-4xl text-white">{days}</span>
                      <button onClick={() => setDays(d => Math.min(d + 1, 7))} className="w-12 h-12 flex items-center justify-center rounded-lg bg-[#262626] text-[#cafd00] text-2xl hover:bg-[#484847] transition-colors">+</button>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3 mt-auto pt-8 pb-4">
                  <Button variant="outline" className="px-5 w-fit" onClick={() => navigatePage(-1)}>←</Button>
                  <Button fullWidth disabled={!experience || !weight || !height} onClick={() => navigatePage(1)}>NEXT PHASE →</Button>
                </div>
              </div>
            )}

            {/* ── PHASE 3 ─────────────────────────────────────────── */}
            {page === 2 && (
              <div className="space-y-8 flex-1">
                <div>
                  <h2 className="font-headline text-3xl font-black text-white italic tracking-tighter uppercase">CONFIGURE<br/>YOUR ARSENAL</h2>
                  <p className="text-[#adaaaa] font-body text-sm mt-2">Adapt your training protocols.</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-label font-semibold tracking-wider text-white mb-2 block">EQUIPMENT ACCESS</label>
                    {EQUIPMENT_OPTIONS.map(eq => {
                      const isSelected = equipment.includes(eq)
                      return (
                        <div key={eq} onClick={() => toggleEquipment(eq)} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${isSelected ? 'border-[#cafd00] bg-[#cafd00]/5' : 'border-[#484847] bg-[#1a1a1a]'}`}>
                          <span className={`material-symbols-filled text-[22px] transition-colors ${isSelected ? 'text-[#cafd00]' : 'text-transparent border-2 border-[#484847] rounded-full w-[22px] h-[22px]'}`}>
                            {isSelected ? 'check_circle' : ''}
                          </span>
                          <span className={`font-body font-semibold ${isSelected ? 'text-white' : 'text-[#adaaaa]'}`}>{eq}</span>
                        </div>
                      )
                    })}
                  </div>

                  <div className="space-y-3 pt-2">
                    <label className="text-xs font-label font-semibold tracking-wider text-white block">PREFERRED TRAINING WINDOW</label>
                    <div className="flex flex-wrap gap-2">
                      {TIME_OPTIONS.map(t => (
                        <button
                          key={t}
                          onClick={() => setTime(t)}
                          className={`py-2 px-4 rounded-full text-xs font-headline font-bold tracking-widest uppercase transition-colors flex-1 ${time === t ? 'bg-[#cafd00] text-black' : 'bg-[#1a1a1a] border border-[#484847] text-[#adaaaa]'}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3 mt-auto pt-8 pb-4">
                  <Button variant="outline" className="px-5 w-fit" disabled={isSubmitting} onClick={() => navigatePage(-1)}>←</Button>
                  <Button fullWidth loading={isSubmitting} disabled={equipment.length === 0 || !time} onClick={handleComplete}>DEPLOY TO COMMAND →</Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
