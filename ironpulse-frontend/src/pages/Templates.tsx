import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../api/client'
import Skeleton from '../components/ui/Skeleton'
import Badge from '../components/ui/Badge'

const FILTERS = ['ALL', 'STRENGTH', 'CARDIO', 'MOBILITY', 'ENDURANCE']

export default function Templates() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeFilter = searchParams.get('category') || 'ALL'

  // Fetch templates logic (mocking response structurally if endpoint not fully live)
  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates', activeFilter],
    queryFn: async () => {
      try {
        const url = activeFilter === 'ALL' ? '/templates' : `/templates?category=${activeFilter}`
        const res = await api.get(url)
        return res.data
      } catch (e) {
        // Mocking for flawless UI presentation during dev
        return [
          { id: '1', title: 'Phase IV: Metcon Overdrive', category: 'CARDIO', difficulty: 'ELITE', duration: '45m', is_vip: true, trainer_name: 'Alex C.', image: '/training/athlete-1.jpg' },
          { id: '2', title: 'Titan Base Building', category: 'STRENGTH', difficulty: 'OPERATOR', duration: '60m', is_vip: false, trainer_name: 'Dr. Mike', image: '/training/athlete-2.jpg' },
          { id: '3', title: 'Armor: Arm Specialization', category: 'STRENGTH', difficulty: 'RECRUIT', duration: '35m', is_vip: false, trainer_name: 'Sarah K.', image: '/training/athlete-5.jpg' },
          { id: '4', title: 'Tactical Endurance', category: 'ENDURANCE', difficulty: 'COMMANDER', duration: '90m', is_vip: true, trainer_name: 'Rex L.', image: '/training/athlete-4.jpg' },
        ]
      }
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  })

  const setFilter = (f: string) => {
    if (f === 'ALL') searchParams.delete('category')
    else searchParams.set('category', f)
    setSearchParams(searchParams)
  }

  const renderSkeletons = () => (
    <div className="space-y-6">
      <Skeleton variant="card" className="h-64" />
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} variant="card" className="h-48" />)}
      </div>
    </div>
  )

  const featured = templates?.find((t: any) => t.is_vip) || templates?.[0]
  const gridItems = templates?.filter((t: any) => t.id !== featured?.id) || []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-headline text-4xl font-black text-white italic tracking-tighter uppercase">PROTOCOLS</h1>
      </div>

      {/* Filter Chips - Horizontal Scroll */}
      <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar -mx-4 px-4">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`whitespace-nowrap px-4 py-2 rounded-full font-headline font-bold text-xs tracking-widest uppercase transition-colors shrink-0 ${
              activeFilter === f ? 'bg-[#cafd00] text-black' : 'bg-[#1a1a1a] border border-[#484847]/50 text-[#adaaaa]'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading ? renderSkeletons() : (
        <div className="space-y-8">
          {/* Featured VIP Protocol */}
          {featured && (
            <Link to={`/templates/${featured.id}`} className="block relative h-64 rounded-3xl overflow-hidden group">
              <div className="absolute inset-0 bg-[#0e0e0e]">
                <img src={featured.image} alt={featured.title} className="w-full h-full object-cover opacity-50 group-hover:opacity-75 transition-opacity duration-700 mix-blend-luminosity" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
              </div>
              
              <div className="absolute inset-0 p-6 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <Badge variant="vip">FEATURED INTEL</Badge>
                  <div className="flex gap-2">
                    <Badge variant="warning">{featured.difficulty}</Badge>
                    <Badge className="bg-[#262626] text-white border-none">{featured.duration}</Badge>
                  </div>
                </div>
                
                <div className="flex justify-between items-end">
                  <div className="max-w-[70%]">
                    <p className="font-label text-xs tracking-widest text-[#cafd00] uppercase mb-1">BY {featured.trainer_name}</p>
                    <h2 className="font-headline text-2xl font-black italic tracking-tighter uppercase text-white leading-none">{featured.title}</h2>
                  </div>
                  <div className="bg-[#cafd00] text-black font-headline font-black text-[10px] px-4 py-2 rounded-full uppercase tracking-widest flex items-center shrink-0">
                    ACTIVATE <span className="material-symbols-outlined text-sm ml-1">arrow_forward</span>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Grid Layout Protocols */}
          <div className="grid grid-cols-2 gap-4">
            {gridItems.map((template: any) => (
              <Link to={`/templates/${template.id}`} key={template.id} className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-[#484847]/40 flex flex-col group">
                <div className="h-32 bg-[#262626] relative overflow-hidden">
                  <img 
                    src={template.image} 
                    alt={template.title} 
                    className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                  />
                  <Badge className="absolute top-2 left-2 !bg-black/60 backdrop-blur-md !border-none !text-[#cafd00] text-[8px]">{template.category}</Badge>
                </div>
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-headline font-black tracking-tight leading-tight text-white uppercase text-sm mb-1 line-clamp-2">{template.title}</h3>
                    <p className="text-[#adaaaa] font-body text-[10px] uppercase">By {template.trainer_name}</p>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-[#484847]/30">
                    <span className="text-[10px] text-white bg-[#262626] px-2 py-0.5 rounded flex items-center gap-1 font-label"><span className="material-symbols-outlined text-[12px]">schedule</span>{template.duration}</span>
                    <span className="text-[10px] text-white bg-[#262626] px-2 py-0.5 rounded font-label uppercase">{template.difficulty}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Featured Trainer Row */}
          <div className="bg-[#1a1a1a] border border-[#484847]/40 rounded-3xl p-6">
            <h3 className="font-headline text-lg font-black italic uppercase tracking-tighter text-white mb-4">Command Roster</h3>
            <div className="flex items-center gap-4 border-b border-[#484847]/40 pb-4 mb-4">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#cafd00]">
                <img src="/training/athlete-2.jpg" alt="Trainer" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="font-headline font-black text-white leading-tight uppercase relative inline-block">Coach Elias <span className="material-symbols-filled text-[#cafd00] text-sm absolute -right-5 top-0 mt-0.5">verified</span></p>
                <p className="text-[#adaaaa] font-body text-xs mt-0.5 tracking-wider uppercase font-semibold">Specialforces Hypertrophy</p>
              </div>
            </div>
            
            {/* Horizontal scroll of their specific programs */}
            <div className="flex overflow-x-auto gap-3 pb-2 -mx-2 px-2 custom-scrollbar">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-40 shrink-0 h-24 bg-[#262626] rounded-xl overflow-hidden relative border border-[#484847]/50">
                  <img src={['/training/athlete-2.jpg', '/training/athlete-3.jpg', '/training/athlete-4.jpg'][i-1]} className="w-full h-full object-cover mix-blend-luminosity opacity-40" />
                  <div className="absolute inset-0 p-3 flex flex-col justify-end">
                    <p className="font-headline font-black text-white uppercase text-xs">Elias Protocol {i}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
