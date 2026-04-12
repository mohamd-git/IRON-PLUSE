import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../api/client'
import Button from '../components/ui/Button'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import Input from '../components/ui/Input'

const FILTERS = ['By Gym', 'Strength Style', 'Same Schedule', 'Near Me']

export default function FindPartner() {
  const [view, setView] = useState<'STACK' | 'SWIPE'>('STACK')
  const [activeFilter, setActiveFilter] = useState('By Gym')
  const [challengingUserId, setChallengingUserId] = useState<string | null>(null)

  // Challenge Modal Form State
  const [cExercise, setCExercise] = useState('')
  const [cWeight, setCWeight] = useState('')
  const [cReps, setCReps] = useState('')

  const { data: partners } = useQuery({
    queryKey: ['partners', activeFilter],
    queryFn: async () => {
      try {
        const res = await api.get('/partners/discover')
        return res.data
      } catch {
        return [
          { id: '1', username: 'IronMaiden', type: 'POWERLIFTER', stats: '2.4 Wilks • 4 Days/Wk', match: 94, image: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=200' },
          { id: '2', username: 'Juggernaut_89', type: 'HYPERTROPHY', stats: '3.1 Wilks • 6 Days/Wk', match: 88, image: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=200' },
          { id: '3', username: 'RexLevel', type: 'TACTICAL', stats: '1.9 Wilks • 3 Days/Wk', match: 82, image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200' },
        ]
      }
    }
  })

  const sendChallenge = async () => {
    try {
      await api.post('/challenges', { target_user: challengingUserId, exercise: cExercise, weight: cWeight, reps: cReps })
      setChallengingUserId(null)
    } catch {
      setChallengingUserId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <h1 className="font-headline text-3xl md:text-4xl font-black text-white italic tracking-tighter uppercase leading-none">
          FIND YOUR<br/>BATTLE PARTNER
        </h1>
      </div>

      {/* View Toggle */}
      <div className="flex bg-[#1a1a1a] border border-[#484847]/50 rounded-lg p-1 w-fit">
        <button onClick={() => setView('STACK')} className={`px-4 py-1.5 text-[10px] font-headline tracking-widest font-bold rounded uppercase transition-colors ${view === 'STACK' ? 'bg-[#cafd00] text-black' : 'text-[#adaaaa]'}`}>STACK</button>
        <button onClick={() => setView('SWIPE')} className={`px-4 py-1.5 text-[10px] font-headline tracking-widest font-bold rounded uppercase transition-colors ${view === 'SWIPE' ? 'bg-[#484847] text-white' : 'text-[#adaaaa]'}`}>SWIPE</button>
      </div>

      <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar -mx-4 px-4">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setActiveFilter(f)} className={`whitespace-nowrap px-4 py-2 rounded-full font-headline font-bold text-[10px] tracking-widest uppercase transition-colors shrink-0 ${activeFilter === f ? 'bg-white text-black' : 'bg-[#1a1a1a] border border-[#484847]/50 text-[#adaaaa]'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-4 pb-4">
        {partners?.map((p: any) => (
          <div key={p.id} className="bg-[#1a1a1a] border border-[#484847]/40 rounded-2xl p-4 flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Avatar src={p.image} name={p.username} size="xl" className="shrink-0 w-20 h-20 rounded-xl" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="font-headline font-black text-lg text-white uppercase truncate">{p.username}</h3>
                  <Badge className="!bg-[#cafd00] !text-black border-none !text-[9px] shrink-0 font-black">{p.match}% MATCH</Badge>
                </div>
                <p className="font-label text-[10px] tracking-widest text-[#cafd00] uppercase mb-1">{p.type}</p>
                <p className="font-body text-xs text-[#adaaaa]">{p.stats}</p>
              </div>
            </div>
            
            <div className="flex gap-2 pt-2 border-t border-[#484847]/30">
              <Button onClick={() => setChallengingUserId(p.id)} className="flex-1 gap-1 !font-black !tracking-tighter" icon="bolt">BATTLE</Button>
              <Link to={`/comms/${p.id}`} className="flex-1">
                <Button variant="outline" fullWidth className="gap-1 !text-white !font-black !tracking-tighter" icon="forum">MESSAGE</Button>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Challenge Configuration Modal */}
      <AnimatePresence>
        {challengingUserId && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-[#1a1a1a] border border-[#484847] w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl relative"
            >
              <button 
                onClick={() => setChallengingUserId(null)}
                className="absolute top-4 right-4 text-[#adaaaa] hover:text-white transition-colors"
               >
                <span className="material-symbols-outlined">close</span>
              </button>
              
              <div className="p-6 border-b border-[#484847]/30">
                <h2 className="font-headline font-black text-2xl italic uppercase text-white tracking-tighter">ISSUE CHALLENGE</h2>
                <p className="font-body text-xs text-[#adaaaa] mt-1">Configure your combat parameters.</p>
              </div>

              <div className="p-6 space-y-4">
                <Input label="EXERCISE DIRECTIVE" placeholder="e.g. Barbell Squat" value={cExercise} onChange={e => setCExercise(e.target.value)} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="TARGET (KG/LBS)" placeholder="e.g. 140" type="number" value={cWeight} onChange={e => setCWeight(e.target.value)} />
                  <Input label="TARGET REPS" placeholder="e.g. 10" type="number" value={cReps} onChange={e => setCReps(e.target.value)} />
                </div>
              </div>

              <div className="p-6 bg-[#0e0e0e] border-t border-[#484847]/30 pt-4">
                <Button fullWidth onClick={sendChallenge} disabled={!cExercise || !cWeight || !cReps}>
                  AUTHORIZE DISPATCH →
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
