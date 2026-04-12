import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '../api/client'
import Skeleton from '../components/ui/Skeleton'
import Badge from '../components/ui/Badge'

const MUSCLE_FILTERS = ['ALL', 'CHEST', 'BACK', 'LEGS', 'SHOULDERS', 'ARMS', 'CORE']
const EQUIPMENT_FILTERS = ['ALL', 'BARBELL', 'DUMBBELL', 'MACHINE', 'BODYWEIGHT', 'CABLE']

const MOCK_EXERCISES = [
  { id: '1', name: 'Barbell Bench Press', muscle_group: 'CHEST', equipment: 'BARBELL', difficulty: 'INTERMEDIATE', image_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80' },
  { id: '2', name: 'Barbell Deadlift', muscle_group: 'BACK', equipment: 'BARBELL', difficulty: 'OPERATOR', image_url: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&q=80' },
  { id: '3', name: 'Barbell Back Squat', muscle_group: 'LEGS', equipment: 'BARBELL', difficulty: 'OPERATOR', image_url: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=400&q=80' },
  { id: '4', name: 'Pull-Up', muscle_group: 'BACK', equipment: 'BODYWEIGHT', difficulty: 'INTERMEDIATE', image_url: 'https://images.unsplash.com/photo-1534367610401-9f5ed68180aa?w=400&q=80' },
  { id: '5', name: 'Overhead Press', muscle_group: 'SHOULDERS', equipment: 'BARBELL', difficulty: 'INTERMEDIATE', image_url: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&q=80' },
  { id: '6', name: 'Dumbbell Curl', muscle_group: 'ARMS', equipment: 'DUMBBELL', difficulty: 'RECRUIT', image_url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&q=80' },
  { id: '7', name: 'Cable Row', muscle_group: 'BACK', equipment: 'CABLE', difficulty: 'INTERMEDIATE', image_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80' },
  { id: '8', name: 'Leg Press', muscle_group: 'LEGS', equipment: 'MACHINE', difficulty: 'RECRUIT', image_url: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=400&q=80' },
  { id: '9', name: 'Dumbbell Fly', muscle_group: 'CHEST', equipment: 'DUMBBELL', difficulty: 'INTERMEDIATE', image_url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80' },
  { id: '10', name: 'Plank', muscle_group: 'CORE', equipment: 'BODYWEIGHT', difficulty: 'RECRUIT', image_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80' },
  { id: '11', name: 'Romanian Deadlift', muscle_group: 'LEGS', equipment: 'BARBELL', difficulty: 'INTERMEDIATE', image_url: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&q=80' },
  { id: '12', name: 'Lateral Raise', muscle_group: 'SHOULDERS', equipment: 'DUMBBELL', difficulty: 'RECRUIT', image_url: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&q=80' },
]

const difficultyVariant: Record<string, 'warning' | 'error' | 'default'> = {
  OPERATOR: 'error',
  INTERMEDIATE: 'warning',
  RECRUIT: 'default',
}

export default function Exercises() {
  const navigate = useNavigate()
  const [muscleFilter, setMuscleFilter] = useState('ALL')
  const [equipFilter, setEquipFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  const { data: exercises, isLoading } = useQuery({
    queryKey: ['exercises'],
    queryFn: async () => {
      try {
        const res = await api.get('/exercises')
        return res.data
      } catch {
        return MOCK_EXERCISES
      }
    }
  })

  const filtered = (exercises || []).filter((ex: any) => {
    const matchMuscle = muscleFilter === 'ALL' || ex.muscle_group === muscleFilter
    const matchEquip = equipFilter === 'ALL' || ex.equipment === equipFilter
    const matchSearch = !search || ex.name.toLowerCase().includes(search.toLowerCase())
    return matchMuscle && matchEquip && matchSearch
  })

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="font-headline text-4xl font-black text-white italic tracking-tighter uppercase leading-none">
          EXERCISE<br/>ARSENAL
        </h1>
        <p className="text-[#adaaaa] font-body text-xs mt-1">Full protocol movement library.</p>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#484847] text-xl pointer-events-none">search</span>
        <input
          type="text"
          placeholder="Search exercises..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#1a1a1a] border border-[#484847]/50 rounded-xl pl-11 pr-4 py-3 text-white font-body text-sm placeholder-[#484847] outline-none focus:border-[#cafd00] transition-colors"
        />
      </div>

      {/* Muscle filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {MUSCLE_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setMuscleFilter(f)}
            className={`shrink-0 px-3 py-1.5 rounded-lg font-headline font-bold text-[10px] tracking-widest uppercase transition-colors ${muscleFilter === f ? 'bg-[#cafd00] text-black' : 'bg-[#1a1a1a] text-[#adaaaa] border border-[#484847]/50 hover:text-white'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Equipment filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {EQUIPMENT_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setEquipFilter(f)}
            className={`shrink-0 px-3 py-1.5 rounded-lg font-headline font-bold text-[10px] tracking-widest uppercase transition-colors ${equipFilter === f ? 'bg-[#262626] text-[#cafd00] border border-[#cafd00]/50' : 'bg-[#1a1a1a] text-[#adaaaa] border border-[#484847]/50 hover:text-white'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Count */}
      <p className="font-label text-[10px] tracking-widest text-[#adaaaa] uppercase font-bold">
        {filtered.length} MOVEMENTS CATALOGUED
      </p>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} variant="card" className="h-44" />)}
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-2 gap-3">
          {filtered.map((ex: any, i: number) => (
            <motion.div
              key={ex.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => navigate(`/training/${ex.id}`)}
              className="bg-[#1a1a1a] border border-[#484847]/40 rounded-2xl overflow-hidden cursor-pointer group"
            >
              <div className="h-28 overflow-hidden relative">
                <img
                  src={ex.image_url}
                  alt={ex.name}
                  className="w-full h-full object-cover grayscale opacity-60 group-hover:opacity-90 group-hover:grayscale-0 transition-all duration-500 mix-blend-luminosity"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] to-transparent" />
              </div>
              <div className="p-3 space-y-1.5">
                <h3 className="font-headline font-bold text-xs text-white uppercase tracking-wider leading-tight">{ex.name}</h3>
                <div className="flex gap-1.5 flex-wrap">
                  <Badge variant={difficultyVariant[ex.difficulty] || 'default'} className="!text-[8px] !px-1.5 !py-0.5">{ex.difficulty}</Badge>
                  <span className="text-[8px] font-label tracking-widest text-[#adaaaa] uppercase font-bold self-center">{ex.equipment}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16 space-y-2">
          <span className="material-symbols-outlined text-4xl text-[#484847]">fitness_center</span>
          <p className="text-[#adaaaa] font-body text-sm">No exercises match your filters.</p>
        </div>
      )}
    </div>
  )
}
