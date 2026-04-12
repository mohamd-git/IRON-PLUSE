import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import api from '../api/client'

export default function PRCelebration() {
  const location = useLocation()
  const navigate = useNavigate()
  const [particles, setParticles] = useState<{ id: number; left: number; delay: number; duration: number }[]>([])

  // Parse state passed deeply dynamically, or mock default
  const { weight = 225, exercise = 'BENCH PRESS', prevWeight = 215, unit = 'LBS', date = 'Today' } = location.state || {}
  const diff = weight - prevWeight

  useEffect(() => {
    // Generate particle positions on mount
    // Generate particle positions on mount mapping precise spec requirements
    const generated = Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100, // 0-100%
      delay: Math.random() * 3, // 0-3s
      duration: 3 + Math.random() * 5, // 3-8s
      opacity: 0.4 + Math.random() * 0.6 // 0.4-1.0
    }))
    setParticles(generated)
  }, [])

  const handleShare = async () => {
    try {
      await api.post('/community/posts', { 
        content: `Just smashed a massive PR on ${exercise}. Locked in ${weight}${unit}! 🔥`, 
      })
      navigate('/feed')
    } catch {
      navigate('/feed')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0e0e0e] overflow-hidden flex flex-col">
      {/* Particle System Keyframes injected via generic CSS */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(100vh); opacity: 0; }
          10% { opacity: var(--target-opacity); }
          100% { transform: translateY(-100vh); opacity: 0; }
        }
      `}</style>
      
      {/* Background Particles Layer */}
      {particles.map(p => (
        <div 
          key={p.id}
          className="absolute bottom-0 w-2 h-2 rounded-full bg-[#cafd00] shadow-[0_0_10px_rgba(202,253,0,0.8)]"
          style={{
            left: `${p.left}%`,
            '--target-opacity': p.opacity,
            animation: `float ${p.duration}s linear infinite`,
            animationDelay: `${p.delay}s`
          } as React.CSSProperties}
        />
      ))}

      {/* Close Action */}
      <button 
        onClick={() => navigate('/workout/active')} 
        className="absolute top-6 right-6 z-20 text-[#adaaaa] hover:text-white transition-colors p-2"
      >
        <span className="material-symbols-outlined text-3xl">close</span>
      </button>

      {/* Center Content */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 p-6 pt-12">
        <Badge className="bg-[#cafd00]/10 text-[#cafd00] border-none tracking-widest font-bold mb-6 font-headline px-4 py-1">
          NEW PERSONAL RECORD
        </Badge>
        
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200, duration: 0.8 }}
          className="flex flex-col items-center my-8"
        >
          <div className="flex items-baseline gap-2">
            <span className="font-headline font-black text-[10rem] tracking-tighter text-white leading-none drop-shadow-[0_0_30px_rgba(202,253,0,0.3)]">
              {weight}
            </span>
            <span className="font-headline font-bold text-3xl text-[#adaaaa] uppercase mb-4">
              {unit}
            </span>
          </div>
          
          <h2 className="font-headline text-4xl font-black italic uppercase tracking-tighter text-white mt-4">
            {exercise}
          </h2>
          <p className="text-[#adaaaa] font-body text-sm mt-3 flex items-center gap-1.5">
            Previous: {prevWeight} {unit} 
            <span className="font-label font-bold text-[#cafd00] text-xs px-2 py-0.5 bg-[#1a1a1a] rounded flex items-center gap-1">
              (+{diff} {unit}) <span className="material-symbols-filled text-[#ff7168] text-[12px]">local_fire_department</span>
            </span>
          </p>
          <p className="text-[#484847] font-label text-[10px] tracking-widest uppercase mt-6">{date}</p>
        </motion.div>
      </div>

      {/* Fixed Actions */}
      <div className="p-6 pb-12 relative z-10 w-full max-w-sm mx-auto space-y-3">
        <Button fullWidth icon="share" onClick={handleShare} className="shadow-[0_0_25px_rgba(202,253,0,0.2)]">SHARE TO FEED</Button>
        <Link to="/battle-log" className="block w-full">
          <Button variant="ghost" fullWidth icon="save" className="!bg-[#1a1a1a] border border-[#484847] text-white hover:!bg-[#262626]">SAVE TO BATTLE LOG</Button>
        </Link>
      </div>
    </div>
  )
}
