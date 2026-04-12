import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import TopHeader from '../components/layout/TopHeader'

export default function VIPPaywall() {
  const [isAnnual, setIsAnnual] = useState(false)
  const navigate = useNavigate()

  const handleCheckout = () => {
    // Navigate with state payload bypassing Redux/Zustand logic for temporary intent
    navigate('/checkout', { state: { plan: isAnnual ? 'annual' : 'monthly', price: isAnnual ? 299 : 39 } })
  }

  return (
    <div className="bg-[#0e0e0e] min-h-screen text-white relative flex flex-col pb-20">
      <TopHeader showBack title="UPGRADE" />
      
      {/* Styles for gold shimmer injection */}
      <style>{`
        @keyframes shimmerGold {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .gold-shimmer {
          background: linear-gradient(90deg, #d4af37 0%, #ffeaa7 25%, #d4af37 50%, #b38b22 75%, #d4af37 100%);
          background-size: 200% auto;
          color: transparent;
          -webkit-background-clip: text;
          background-clip: text;
          animation: shimmerGold 4s linear infinite;
        }
      `}</style>
      
      {/* Hero Block */}
      <div className="relative h-72 w-full pt-16">
        <img 
          src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1000&auto=format&fit=crop" 
          alt="Lounge" 
          className="absolute inset-0 w-full h-full object-cover mix-blend-luminosity opacity-40 grayscale-[50%]" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-[#0e0e0e]/50 to-transparent" />
        <div className="absolute bottom-6 left-6 pr-6">
          <p className="font-label text-xs tracking-widest text-[#adaaaa] uppercase mb-1">Authorization Layer</p>
          <h1 className="text-4xl md:text-5xl font-black font-headline uppercase tracking-tighter leading-none italic">
            ASCEND TO <span className="gold-shimmer drop-shadow-[0_0_10px_rgba(212,175,55,0.4)]">VIP</span>
          </h1>
        </div>
      </div>

      <div className="px-6 flex-1 flex flex-col gap-8">
        
        {/* Modern Toggle Switch */}
        <div className="mx-auto w-full max-w-[240px] bg-[#1a1a1a] rounded-full p-1 flex relative border border-[#484847]/50 shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
          <motion.div 
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#484847] rounded-full pointer-events-none"
            animate={{ left: isAnnual ? 'calc(50% + 2px)' : '2px' }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
          <button 
            className={`flex-1 relative z-10 py-2.5 font-headline font-black text-xs uppercase tracking-widest transition-colors ${!isAnnual ? 'text-white' : 'text-[#adaaaa]'}`}
            onClick={() => setIsAnnual(false)}
          >
            MONTHLY
          </button>
          <button 
            className={`flex-1 relative z-10 py-2.5 font-headline font-black text-xs uppercase tracking-widest transition-colors ${isAnnual ? 'text-white' : 'text-[#adaaaa]'}`}
            onClick={() => setIsAnnual(true)}
          >
            ANNUAL
          </button>
        </div>

        {/* Primary Paywall Card */}
        <div className="bg-[#1a1a1a] border-2 border-[#d4af37]/30 rounded-[2rem] p-6 relative overflow-hidden flex flex-col shadow-[0_0_40px_rgba(212,175,55,0.05)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />
          
          <h2 className="font-headline text-3xl font-black italic tracking-tighter uppercase gold-shimmer block w-fit mb-2">
            VIP ELITE
          </h2>
          
          <div className="flex items-baseline gap-1 mb-6">
            <span className="font-headline font-black text-white text-5xl tracking-tighter">
              RM {isAnnual ? '299' : '39'}
            </span>
            <span className="text-[#adaaaa] font-label text-sm uppercase tracking-widest">
              / {isAnnual ? 'YEAR' : 'MONTH'}
            </span>
            {isAnnual && (
              <span className="ml-3 bg-[#cafd00] text-black font-label text-[9px] font-bold px-2 py-0.5 rounded tracking-widest uppercase shadow-[0_0_10px_rgba(202,253,0,0.2)]">
                SAVE 35%
              </span>
            )}
          </div>

          <div className="space-y-4 flex-1">
            {[
              'Direct AI Coach Comms Integration',
              'Unlock 24/7 Virtual VIP Lounge',
              'Advanced Biometric Analysis',
              'Unlimited Exercise History',
              'Prioritized Matchmaking algorithm',
              'Exclusive App Profile Badging',
              'Dedicated Technical Support'
            ].map(benefit => (
              <div key={benefit} className="flex gap-3">
                <span className="material-symbols-filled text-[#cafd00] shrink-0 text-lg mt-0.5 drop-shadow-[0_0_5px_rgba(202,253,0,0.3)]">check_circle</span>
                <span className="font-body text-sm font-semibold text-white/90 leading-tight">{benefit}</span>
              </div>
            ))}
          </div>

          <button 
            onClick={handleCheckout}
            className="w-full mt-8 py-5 rounded-2xl font-headline font-black text-black tracking-widest uppercase transition-all"
            style={{ background: 'linear-gradient(135deg, #ffeaa7 0%, #d4af37 50%, #b38b22 100%)', boxShadow: '0 0 20px rgba(212, 175, 55, 0.2)' }}
          >
            UNLOCK VIP ELITE →
          </button>
        </div>

        {/* Feature Previews */}
        <div>
          <p className="font-label text-[10px] uppercase font-bold tracking-widest text-[#adaaaa] mb-4">CLASSIFIED MODULES UNLOCKED</p>
          <div className="flex overflow-x-auto gap-3 custom-scrollbar pb-2 pr-4 -mr-6">
            <div className="shrink-0 w-[220px] h-[130px] rounded-[20px] bg-[#262626] border border-[#d4af37]/20 relative overflow-hidden">
              <img src="https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=400" className="w-full h-full object-cover mix-blend-luminosity opacity-40 grayscale" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] to-transparent flex flex-col justify-end p-4">
                <span className="material-symbols-filled text-[#d4af37] text-2xl mb-1">forum</span>
                <span className="font-headline font-bold text-sm tracking-wider uppercase text-white">VIP Lounge</span>
              </div>
            </div>
            <div className="shrink-0 w-[220px] h-[130px] rounded-[20px] bg-[#262626] border border-[#d4af37]/20 relative overflow-hidden">
              <img src="https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=400" className="w-full h-full object-cover mix-blend-luminosity opacity-40 grayscale" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] to-transparent flex flex-col justify-end p-4">
                <span className="material-symbols-filled text-[#d4af37] text-2xl mb-1">psychology</span>
                <span className="font-headline font-bold text-sm tracking-wider uppercase text-white">Advanced AI Coach</span>
              </div>
            </div>
            <div className="shrink-0 w-[220px] h-[130px] rounded-[20px] bg-[#262626] border border-[#d4af37]/20 relative overflow-hidden">
              <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=400" className="w-full h-full object-cover mix-blend-luminosity opacity-40 grayscale" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] to-transparent flex flex-col justify-end p-4">
                <span className="material-symbols-filled text-[#d4af37] text-2xl mb-1">analytics</span>
                <span className="font-headline font-bold text-sm tracking-wider uppercase text-white">Biometric Array</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Tickers Stack */}
        <div className="pt-4 border-t border-[#484847]/30 flex flex-col items-center">
          <p className="font-label text-[10px] text-[#484847] font-bold tracking-widest uppercase mb-3 text-center">SECURE ENCRYPTED PROTOCOL</p>
          <div className="flex items-center justify-center gap-6 opacity-30 invert-[0.8]">
            <span className="font-headline font-black italic tracking-tighter">Touch'n Go</span>
            <span className="font-headline font-black italic tracking-tighter text-red-500">BOOST</span>
            <span className="font-headline font-black tracking-tighter">FPX</span>
            <span className="font-headline font-black italic tracking-wider">VISA</span>
          </div>
        </div>

      </div>
    </div>
  )
}
