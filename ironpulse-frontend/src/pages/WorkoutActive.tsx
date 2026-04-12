import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useWorkoutSession } from '../hooks/useWorkoutSession'

import PageWrapper from '../components/layout/PageWrapper'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'

export default function ActiveWorkout() {
  const navigate = useNavigate()
  const location = useLocation()
  const store = useWorkoutSession()

  const [currentWeight, setCurrentWeight] = useState(100)
  const [currentReps, setCurrentReps] = useState(10)

  const workoutTitle = location.state?.name || 'Tactical Hypertrophy - Alpha'

  // Always clear any stale persisted session when arriving at this page fresh
  useEffect(() => {
    if (store.isActive) store.abandonSession()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleGetStarted = () => {
    const newId = crypto.randomUUID()
    store.startSession(newId, workoutTitle)
  }

  const handleFinish = () => {
    store.completeSession()
    navigate(`/workout/summary/${store.sessionId || 'current'}`)
  }

  const handleLogSet = async () => {
    store.logSet('ex_1', 'Barbell Deadlift', currentReps, currentWeight, false)
    store.startRest(90)
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <PageWrapper
      hideBottomNav
      headerProps={{
        title: store.isActive ? (store.sessionName || 'ACTIVE SESSION') : workoutTitle,
        showBack: true,
        rightContent: store.isActive ? (
          <button
            onClick={handleFinish}
            className="bg-[#c00018] text-white font-headline font-black px-4 py-1.5 rounded uppercase tracking-widest text-xs hover:bg-red-700 transition"
          >
            FINISH
          </button>
        ) : undefined
      }}
    >
      <div className="space-y-6 pt-4 relative">

        {/* Timer Block — shows GET STARTED before session, clock after */}
        <div className="bg-[#1a1a1a] border border-[#484847]/30 rounded-3xl p-6">
          {store.isActive ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={store.togglePause}
                  className={`material-symbols-filled text-5xl transition-colors ${store.isPaused ? 'text-[#ff7168]' : 'text-[#cafd00]'}`}
                >
                  {store.isPaused ? 'play_circle' : 'pause_circle'}
                </button>
                <div className="flex flex-col">
                  <span className="font-label text-[10px] tracking-widest text-[#adaaaa] uppercase mb-1">Time Elapsed</span>
                  <span className="font-headline font-black text-6xl tabular-nums tracking-tighter text-white leading-none">
                    {formatTime(store.elapsedSeconds)}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1 items-end">
                <Badge className="!bg-[#262626] !text-[#adaaaa] !border-none !text-[10px]">{Math.round(store.totalVolumeKg)}KG VOL</Badge>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="flex flex-col items-center">
                <span className="font-label text-[10px] tracking-widest text-[#adaaaa] uppercase mb-1">Timer</span>
                <span className="font-headline font-black text-6xl tabular-nums tracking-tighter text-[#484847] leading-none select-none">
                  00:00
                </span>
              </div>
              <button
                onClick={handleGetStarted}
                className="w-full bg-[#cafd00] text-black font-headline font-black text-sm tracking-widest uppercase px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:bg-[#b8e800] active:scale-95 transition-all shadow-[0_0_25px_rgba(202,253,0,0.3)]"
              >
                <span className="material-symbols-filled text-xl">play_arrow</span>
                GET STARTED
              </button>
            </div>
          )}
        </div>

        {/* Current Exercise Hero */}
        <div className="relative h-56 w-full rounded-3xl overflow-hidden bg-[#262626] border border-[#484847]/30">
          <img
            src="https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=80"
            alt="Exercise"
            className="absolute inset-0 w-full h-full object-cover grayscale opacity-50 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-[#0e0e0e]/20 to-transparent" />

          <Badge className="absolute top-4 right-4 !bg-black/60 backdrop-blur-md !text-[#cafd00] !border-none tracking-widest">
            SET {Math.min(store.currentSetIndex + 1, 5)}/5
          </Badge>

          <div className="absolute bottom-4 left-4 right-4">
            <h2 className="font-headline text-3xl font-black text-white italic tracking-tighter uppercase mb-2">Barbell Deadlift</h2>
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className={`flex-1 h-1.5 rounded-full ${i < store.currentSetIndex ? 'bg-[#cafd00]' : i === store.currentSetIndex ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'bg-[#262626]'}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Adjusters */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#1a1a1a] rounded-3xl border border-[#484847]/30 p-4 flex flex-col items-center">
            <span className="font-label text-xs tracking-widest text-[#adaaaa] uppercase mb-4">Weight (KG)</span>
            <div className="flex items-center justify-between w-full">
              <button
                onClick={() => setCurrentWeight(w => Math.max(0, w - 2.5))}
                className="w-12 h-12 flex items-center justify-center rounded-xl bg-[#262626] hover:bg-[#484847] text-2xl font-bold text-white transition-colors"
              >
                −
              </button>
              <span className="font-headline font-black text-4xl text-white select-none">{currentWeight}</span>
              <button
                onClick={() => setCurrentWeight(w => w + 2.5)}
                className="w-12 h-12 flex items-center justify-center rounded-xl bg-[#262626] hover:bg-[#484847] text-[#cafd00] text-2xl font-bold transition-colors"
              >
                +
              </button>
            </div>
          </div>

          <div className="bg-[#1a1a1a] rounded-3xl border border-[#484847]/30 p-4 flex flex-col items-center">
            <span className="font-label text-xs tracking-widest text-[#adaaaa] uppercase mb-4">Target Reps</span>
            <div className="flex items-center justify-between w-full">
              <button
                onClick={() => setCurrentReps(r => Math.max(0, r - 1))}
                className="w-12 h-12 flex items-center justify-center rounded-xl bg-[#262626] hover:bg-[#484847] text-2xl font-bold text-white transition-colors"
              >
                −
              </button>
              <span className="font-headline font-black text-4xl text-white select-none">{currentReps}</span>
              <button
                onClick={() => setCurrentReps(r => r + 1)}
                className="w-12 h-12 flex items-center justify-center rounded-xl bg-[#262626] hover:bg-[#484847] text-[#cafd00] text-2xl font-bold transition-colors"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Set Row Circles */}
        <div className="bg-[#1a1a1a] rounded-[2rem] border border-[#484847]/30 p-4 flex justify-between items-center px-6">
          {[0, 1, 2, 3, 4].map(idx => {
            const isCompleted = idx < store.currentSetIndex
            const isCurrent = idx === store.currentSetIndex
            return (
              <div
                key={idx}
                className={`w-[45px] h-[45px] rounded-full flex items-center justify-center font-headline font-bold text-sm transition-colors border-2 ${
                  isCompleted ? 'bg-[#cafd00] border-[#cafd00] text-black'
                  : isCurrent ? 'bg-white border-white text-black drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]'
                  : 'bg-transparent border-[#484847] text-[#adaaaa]'
                }`}
              >
                {isCompleted ? <span className="material-symbols-filled text-base">check</span> : idx + 1}
              </div>
            )
          })}
        </div>

        <Button
          size="lg"
          fullWidth
          icon="add"
          onClick={handleLogSet}
          disabled={!store.isActive || store.isResting}
          className="my-4 shadow-[0_0_20px_rgba(202,253,0,0.15)] h-16 text-xl"
        >
          LOG SET
        </Button>

        {/* Up Next Queue */}
        <div className="pt-4 border-t border-[#484847]/30 overflow-hidden">
          <p className="font-label text-xs tracking-widest text-[#adaaaa] uppercase mb-4 pl-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">schedule</span> UP NEXT
          </p>
          <div className="flex overflow-x-auto gap-4 custom-scrollbar pb-4 pr-4">
            {['Leg Press', 'Hamstring Curls', 'Calf Raises'].map(ex => (
              <div key={ex} className="w-56 shrink-0 bg-[#1a1a1a] rounded-2xl p-4 border border-[#484847]/30 flex items-center gap-4">
                <div className="w-12 h-12 bg-[#262626] rounded-xl flex items-center justify-center text-[#adaaaa] shrink-0">
                  <span className="material-symbols-outlined">fitness_center</span>
                </div>
                <div>
                  <p className="text-white font-headline font-bold uppercase text-sm truncate w-32">{ex}</p>
                  <p className="text-[#adaaaa] text-[10px] font-label uppercase">3 Sets • 8-12 Reps</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rest Overlay */}
      <AnimatePresence>
        {store.isResting && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center p-6"
          >
            <h3 className="font-headline text-2xl font-black italic text-white uppercase tracking-tighter mb-12">RECOVER</h3>

            <div className="relative flex flex-col items-center justify-center mb-16">
              <svg width="240" height="240" className="transform -rotate-90">
                <circle cx="120" cy="120" r="110" fill="none" stroke="#262626" strokeWidth="6" />
                <motion.circle
                  cx="120" cy="120" r="110"
                  fill="none"
                  stroke="#cafd00"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 110}
                  animate={{ strokeDashoffset: (2 * Math.PI * 110) * (1 - store.restSecondsRemaining / 90) }}
                  transition={{ duration: 1, ease: 'linear' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-headline font-black text-8xl tabular-nums tracking-tighter text-white">
                  {store.restSecondsRemaining}
                </span>
                <span className="font-label tracking-widest text-[#cafd00]">SECONDS</span>
              </div>
            </div>

            <button
              onClick={store.skipRest}
              className="text-[#adaaaa] font-label text-sm uppercase tracking-widest hover:text-white transition-colors border-b border-transparent hover:border-white pb-1"
            >
              SKIP REST
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  )
}
