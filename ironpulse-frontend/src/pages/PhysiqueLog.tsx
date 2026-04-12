import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import api from '../api/client'
import { format } from 'date-fns'

import WeightTrendLine from '../components/charts/WeightTrendLine'

export default function PhysiqueProtocol() {
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: progress } = useQuery({
    queryKey: ['physiqueProgress'],
    queryFn: async () => {
      try {
        const res = await api.get('/physique/progress')
        return res.data
      } catch {
        return {
          goal_completion: 68,
          weights: [
            { date: 'Oct 01', weight_kg: 84.5 },
            { date: 'Oct 08', weight_kg: 83.8 },
            { date: 'Oct 15', weight_kg: 83.2 },
            { date: 'Oct 22', weight_kg: 82.6 },
            { date: 'Oct 29', weight_kg: 81.9 },
            { date: 'Nov 05', weight_kg: 82.1 },
            { date: 'Nov 12', weight_kg: 81.4 },
            { date: 'Nov 19', weight_kg: 80.8 }
          ],
          measurements: [
            { label: 'Chest', value: '108', unit: 'cm', delta: '+1.2', status: 'up' },
            { label: 'Waist', value: '82', unit: 'cm', delta: '-3.4', status: 'down' },
            { label: 'Hips', value: '96', unit: 'cm', delta: '-1.1', status: 'down' },
            { label: 'Arms', value: '41', unit: 'cm', delta: '+0.5', status: 'up' },
            { label: 'Quads', value: '64', unit: 'cm', delta: '+1.8', status: 'up' },
            { label: 'Calves', value: '40', unit: 'cm', delta: '+0.2', status: 'up' }
          ],
          photos: [
            { id: '1', date: 'NOV 19', image: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=400' },
            { id: '2', date: 'OCT 19', image: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?q=80&w=400' },
            { id: '3', date: 'SEP 19', image: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=400' },
            { id: '4', date: 'AUG 19', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=400' },
          ]
        }
      }
    }
  })

  const [uploading, setUploading] = useState(false)

  const onDrop = async (files: File[]) => {
    if (!files[0]) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', files[0])
    try {
      await api.post('/physique/photos', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      // Refetch photos after upload
      queryClient.invalidateQueries({ queryKey: ['physiqueProgress'] })
    } catch {
      // silently fail — will show old data
    } finally {
      setUploading(false)
    }
  }
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': ['.jpeg', '.jpg', '.png'] } })

  return (
    <div className="space-y-8 pb-10">
      <div>
        <span className="font-label text-xs tracking-widest text-[#adaaaa] uppercase mb-1 drop-shadow-[0_0_10px_rgba(202,253,0,0.3)] block font-bold">
           {format(new Date(), 'EEEE, MMMM do yyyy')}
        </span>
        <h1 className="font-headline text-4xl mt-1 font-black text-[#cafd00] italic tracking-tighter uppercase leading-none drop-shadow-[0_0_15px_rgba(202,253,0,0.2)]">
          PHYSIQUE<br/>PROTOCOL
        </h1>
      </div>

      {/* Goal Tracker */}
      <div className="bg-[#1a1a1a] rounded-3xl border border-[#484847]/40 p-4">
        <div className="flex justify-between items-end mb-2 px-1">
          <span className="font-headline font-bold text-sm tracking-wider uppercase text-white">Target Objective Completion</span>
          <span className="font-headline font-black text-[#cafd00] tracking-widest">{progress?.goal_completion}%</span>
        </div>
        <div className="h-3 w-full bg-[#0e0e0e] rounded-full overflow-hidden border border-[#484847]/50 shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)]">
          <motion.div 
            initial={{ width: 0 }} 
            animate={{ width: `${progress?.goal_completion || 0}%` }} 
            transition={{ duration: 1.5, ease: 'easeOut' }}
            className="h-full bg-[#cafd00] rounded-full shadow-[0_0_10px_rgba(202,253,0,0.8)]" 
          />
        </div>
      </div>

      {/* Weight Trend Matrix */}
      <div className="bg-[#1a1a1a] rounded-3xl border border-[#484847]/40 p-6 flex flex-col justify-between overflow-hidden relative">
        <p className="font-label text-[10px] tracking-widest text-[#adaaaa] uppercase mb-4 pl-1">Body Mass Variation</p>
        <div className="h-32 -mx-4 -mb-4">
          <WeightTrendLine data={progress?.weights || []} />
        </div>
      </div>

      {/* Measurements Matrix (2-col) */}
      <div className="grid grid-cols-2 gap-3">
        {progress?.measurements?.map((m: any, i: number) => (
          <div key={i} className="bg-[#1a1a1a] border border-[#484847]/40 rounded-2xl p-4 flex flex-col">
            <span className="font-label text-[10px] tracking-widest text-[#adaaaa] uppercase mb-1">{m.label}</span>
            <div className="flex items-baseline gap-1">
              <span className="font-headline font-black text-2xl tracking-tighter text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]">{m.value}</span>
              <span className="font-headline font-bold text-[#484847] text-xs pb-1 tracking-wider">{m.unit}</span>
            </div>
            
            <div className="mt-2 flex items-center gap-1 bg-[#262626] w-fit px-2 py-0.5 rounded">
              {m.status === 'down' ? (
                <span className="material-symbols-filled text-[#cafd00] text-[12px]">trending_down</span>
              ) : (
                <span className="material-symbols-filled text-[#ff7168] text-[12px]">trending_up</span>
              )}
              <span className={`font-label text-xs font-bold tracking-widest ${m.status === 'down' ? 'text-[#cafd00]' : 'text-[#ff7168]'}`}>{m.delta}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Visual Progress Arrays */}
      <div>
        <p className="font-label text-[10px] px-2 font-bold tracking-widest text-[#adaaaa] uppercase mb-3 border-b border-[#484847]/30 pb-2">CHRONOLOGICAL DATABASE</p>
        <div className="grid grid-cols-2 gap-3">
          {progress?.photos?.map((p: any) => (
            <div 
              key={p.id} 
              onClick={() => setFullscreenImage(p.image)}
              className="bg-[#1a1a1a] border border-[#484847]/40 rounded-2xl h-48 overflow-hidden relative group cursor-pointer"
            >
               <img src={p.image} className="w-full h-full object-cover transition-all duration-500 grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 mix-blend-luminosity" />
               <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e]/80 to-transparent pointer-events-none" />
               <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md border md font-body font-bold text-[10px] px-2 py-1 tracking-widest rounded uppercase text-[#cafd00]">
                 {p.date}
               </div>
            </div>
          ))}
          
          {/* Upload Block */}
          <div className="col-span-2 mt-2 bg-[#262626] rounded-3xl border-2 border-dashed border-[#484847] p-8 flex flex-col items-center justify-center text-center hover:border-[#cafd00] hover:bg-[#1a1a1a] transition-all cursor-pointer" {...getRootProps()}>
            <input {...getInputProps()} />
            <span className="material-symbols-outlined text-4xl text-[#adaaaa] mb-2 group-hover:text-white transition-colors">camera</span>
            <h4 className="font-headline font-black uppercase text-sm tracking-wider text-white">UPDATE STRUCTURAL LOG</h4>
            <p className="font-body text-[10px] text-[#adaaaa] max-w-[200px] mt-2">Deploy new chronological biometric captures direct to target directories.</p>
            {(isDragActive || uploading) && <p className="text-[10px] text-[#cafd00] font-bold tracking-widest uppercase mt-4">{uploading ? 'TRANSMITTING...' : 'DROP TO UPLOAD'}</p>}
          </div>
        </div>
      </div>

      {/* Fullscreen Overlay */}
      <AnimatePresence>
        {fullscreenImage && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[100] bg-black/96 backdrop-blur-xl flex flex-col"
          >
             <div className="h-16 flex items-center justify-end px-6 shrink-0 relative z-10 w-full">
                <button onClick={() => setFullscreenImage(null)} className="p-2 rounded-full bg-[#1a1a1a] text-[#adaaaa] hover:text-white transition-colors border border-[#484847]">
                  <span className="material-symbols-outlined mt-0.5">close</span>
                </button>
             </div>
             <div className="flex-1 overflow-hidden p-4 pb-12 flex items-center justify-center relative -top-8 z-0">
               <motion.img 
                  initial={{ scale: 0.9 }} 
                  animate={{ scale: 1 }} 
                  exit={{ scale: 0.9 }}
                  src={fullscreenImage} 
                  className="w-full h-full object-contain filter drop-shadow-2xl" 
               />
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
