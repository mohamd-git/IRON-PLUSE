import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useWorkoutSession } from '../hooks/useWorkoutSession'

export default function ActivePulse() {
  const store = useWorkoutSession()
  const [bpm, setBpm] = useState(147)
  const [rpe, setRpe] = useState(8)
  
  // Fake minor heartbeat fluctuations for UI realism
  useEffect(() => {
    const int = setInterval(() => {
      setBpm(prev => prev + Math.floor(Math.random() * 5) - 2)
    }, 2000)
    return () => clearInterval(int)
  }, [])

  return (
    <div className="fixed inset-0 bg-[#0e0e0e] z-50 flex flex-col justify-between overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-6">
        <div className="flex items-center gap-2">
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff7168] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#c00018]"></span>
          </div>
          <span className="font-headline font-bold italic tracking-widest text-[#ff7168] text-sm uppercase">
            ACTIVE PULSE
          </span>
        </div>
        <button className="text-white hover:text-[#ff7168] transition-colors p-2">
          <span className="material-symbols-outlined text-3xl">close</span>
        </button>
      </div>

      {/* Central Heartbeat Ring */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div 
            animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.3, 0.1] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
            className="w-64 h-64 border-4 border-[#ff7168] rounded-full blur-[2px]"
          />
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
            className="absolute rounded-full w-80 h-80 border-t-2 border-r-2 border-[#cafd00] border-l-2 border-b-2 border-l-transparent border-b-transparent"
          />
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <span className="material-symbols-filled text-[#ff7168] text-4xl mb-2 animate-pulse">favorite</span>
          <span className="font-headline font-black text-9xl tracking-tighter text-white tabular-nums drop-shadow-[0_0_30px_rgba(255,113,104,0.3)]">
            {bpm}
          </span>
          <span className="font-label text-sm tracking-widest text-[#adaaaa]">BPM</span>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="px-6 py-4 grid grid-cols-3 gap-4 border-t border-[#484847]/30 bg-[#1a1a1a]/50">
        <div className="flex flex-col items-center">
          <span className="text-[#adaaaa] font-label text-[10px] tracking-widest uppercase mb-1">Calories</span>
          <span className="text-white font-headline font-black text-2xl tracking-tighter">482</span>
        </div>
        <div className="flex flex-col items-center border-l border-r border-[#484847]/30">
          <span className="text-[#adaaaa] font-label text-[10px] tracking-widest uppercase mb-1">Volume</span>
          <span className="text-[#cafd00] font-headline font-black text-2xl tracking-tighter">{Math.round(store.totalVolumeKg)}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[#adaaaa] font-label text-[10px] tracking-widest uppercase mb-1">Elapsed</span>
          <span className="text-white font-headline font-black text-2xl tracking-tighter">{Math.floor(store.elapsedSeconds / 60)}M</span>
        </div>
      </div>

      {/* RPE & Actions */}
      <div className="px-6 pb-10 space-y-8 bg-[#0e0e0e] pt-6 relative z-10">
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <label className="text-[#adaaaa] font-label text-xs uppercase tracking-widest">Perceived Exertion (RPE)</label>
            <span className="text-white font-headline font-black text-3xl leading-none">{rpe}</span>
          </div>
          <input 
            type="range" 
            min="1" 
            max="10" 
            value={rpe}
            onChange={(e) => setRpe(Number(e.target.value))}
            className="w-full h-2 bg-[#262626] rounded-lg appearance-none cursor-pointer accent-[#cafd00]" 
          />
          <div className="flex justify-between text-[10px] font-label text-[#484847] uppercase font-bold tracking-widest px-1">
            <span>EZ</span>
            <span>MAX OUT</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => { store.logSet('pulse_ex', 'Pulse Engine', 10, 100, false); store.startRest(60); }}
            className="bg-[#cafd00] hover:bg-white text-black font-headline font-black uppercase text-xl py-6 rounded-2xl flex flex-col items-center justify-center gap-1 transition-colors"
          >
            <span className="material-symbols-filled">add_circle</span>
            LOG SET
          </button>
          <div className="grid grid-rows-2 gap-4">
            <button 
              onClick={() => store.startRest(60)}
              className="bg-[#262626] hover:bg-[#484847] text-white font-headline font-black uppercase tracking-widest rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">timer</span> REST
            </button>
            <button 
              onClick={store.skipRest}
              className="bg-transparent border border-[#484847] hover:border-white text-[#adaaaa] hover:text-white font-headline font-black uppercase tracking-widest rounded-xl text-sm transition-colors flex items-center justify-center"
            >
              SKIP
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
