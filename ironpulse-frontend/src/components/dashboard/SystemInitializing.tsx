import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Button from '../ui/Button'
import RecoveryRing from '../charts/RecoveryRing'
import Badge from '../ui/Badge'

export default function SystemInitializing() {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-6 pt-2 pb-10"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff7168] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#c00018]"></span>
        </div>
        <span className="font-label text-xs font-semibold tracking-widest text-[#ff7168] uppercase">
          System Status: Awaiting Calibration
        </span>
      </div>

      <div className="mb-10">
        <h1 className="text-5xl md:text-7xl font-black font-headline italic tracking-tighter text-white">
          SYSTEM<br/>INITIALIZING
        </h1>
        <p className="text-[#adaaaa] font-body text-sm mt-3 max-w-sm">
          Biometric links inactive. Core telemetry pending user-driven stimulus.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 md:auto-rows-[120px] gap-4">
        {/* 1. Primary CTA */}
        <div className="md:col-span-8 md:row-span-3 relative bg-[#1a1a1a] rounded-3xl overflow-hidden border border-[#484847]/40 flex flex-col justify-end p-6 md:p-8 min-h-[350px]">
          <div className="absolute inset-0">
            <img 
              src="https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=1469&auto=format&fit=crop"
              alt="Gym Tactical" 
              className="w-full h-full object-cover opacity-40 mix-blend-luminosity"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-[#0e0e0e]/80 to-transparent" />
          </div>
          
          <div className="relative z-10 space-y-4">
            <Badge variant="vip" className="w-fit">CORE_PROTOCOL_01</Badge>
            <h2 className="text-3xl font-black font-headline text-white uppercase tracking-tighter flex items-center gap-2">
              <span className="material-symbols-filled text-[#cafd00]">bolt</span>
              NO DATA DETECTED.<br/>FORCE THE CONNECTION.
            </h2>
            <Link to="/training" className="block w-fit mt-4">
              <Button icon="arrow_forward">Initiate First Calibration</Button>
            </Link>
          </div>
        </div>

        {/* 2. Metabolic Stress Ring */}
        <div className="md:col-span-4 md:row-span-2 bg-[#1a1a1a] rounded-3xl border border-[#484847]/40 p-6 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <div className="w-48 h-48 rounded-full bg-[#ff7168] blur-3xl animate-pulse" />
          </div>
          <div className="relative z-10 scale-125">
            <RecoveryRing percentage={0} size={110} label="Stress" />
          </div>
          <p className="font-headline font-bold text-sm tracking-widest text-[#adaaaa] uppercase mt-6 relative z-10">
            Metabolic Stress
          </p>
        </div>

        {/* 3. Weekly Load Stubs */}
        <div className="md:col-span-4 md:row-span-1 bg-[#1a1a1a] rounded-3xl border border-[#484847]/40 p-6 flex flex-col justify-center">
          <p className="font-label text-[10px] tracking-widest text-[#adaaaa] mb-3">WEEKLY LOAD</p>
          <div className="flex justify-between items-end h-16 w-full px-2">
            {days.map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-6 h-4 bg-[#262626] rounded-sm" />
                <span className="text-[10px] font-label text-[#adaaaa]">{day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Recovery Status Details */}
        <div className="md:col-span-4 md:row-span-2 bg-[#1a1a1a] rounded-3xl border border-[#484847]/40 p-6">
          <p className="font-label text-[10px] tracking-widest text-[#adaaaa] mb-4 uppercase">Telemetry Status</p>
          <div className="grid grid-cols-2 gap-4 h-full pb-4">
            <div className="flex flex-col gap-1">
              <span className="text-[#adaaaa] text-xs font-body flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">favorite</span> HRV
              </span>
              <span className="font-headline font-black text-2xl text-[#484847]">—</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[#adaaaa] text-xs font-body flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">bedtime</span> Sleep
              </span>
              <span className="font-headline font-black text-2xl text-[#484847]">—</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[#adaaaa] text-xs font-body flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">healing</span> Soreness
              </span>
              <span className="font-headline font-black text-2xl text-[#484847]">—</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[#adaaaa] text-xs font-body flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">flash_on</span> Readiness
              </span>
              <span className="font-headline font-black text-2xl text-[#484847]">—</span>
            </div>
          </div>
        </div>

        {/* 5. Mission Brief CTA */}
        <div className="md:col-span-8 md:row-span-1 bg-[#cafd00] rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="font-headline text-xl font-black text-black tracking-tighter uppercase">Your first mission awaits</h3>
            <p className="text-black/70 text-sm font-label mt-1">Complete your first session to unlock deep analytics.</p>
          </div>
          <Link to="/training">
            <button className="bg-black text-[#cafd00] font-headline font-black py-3 px-6 rounded-xl tracking-widest text-sm hover:brightness-125 transition-all w-full md:w-auto">
              VIEW BRIEF
            </button>
          </Link>
        </div>

        {/* 6. Community Status */}
        <div className="md:col-span-4 md:row-span-1 bg-[#1a1a1a] rounded-3xl border border-[#484847]/40 p-6 flex flex-col justify-between">
          <p className="font-label text-[10px] tracking-widest text-[#adaaaa] uppercase mb-2">Network Status</p>
          <Link to="/feed">
            <Button variant="outline" fullWidth size="sm" icon="cell_tower" className="!bg-[#262626] !border-none !text-white hover:!bg-[#484847]">
              JOIN THE NETWORK
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  )
}
