import { useQuery } from '@tanstack/react-query'
import api from '../api/client'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'

export default function IntegrationHub() {
  
  const { data: status } = useQuery({
    queryKey: ['integrationStatus'],
    queryFn: async () => {
      try {
        const res = await api.get('/integrations/status')
        return res.data
      } catch {
        return {
          'garmin': true,
          'apple_health': false,
          'google_fit': false,
          'whoop': false,
          'myfitnesspal': true,
        }
      }
    }
  })

  const IntegrationCard = ({ id, name, description, icon, isConnected }: any) => {
    const handleConnect = async () => {
      // OAuth logic simulation
      alert(`Initializing secure handshake with ${name} servers...`)
      // api.post(`/integrations/${id}/connect`)
    }

    return (
      <div className="bg-[#1a1a1a] rounded-2xl border border-[#484847]/40 p-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-black border border-[#484847] flex items-center justify-center shrink-0 shadow-[inset_0_2px_5px_rgba(255,255,255,0.05)]">
            <span className="font-headline font-black text-xl italic text-white leading-none tracking-tighter">{icon}</span>
          </div>
          <div>
            <h3 className="font-headline font-black text-sm uppercase tracking-wider text-white">{name}</h3>
            <p className="font-body text-[10px] text-[#adaaaa] mt-0.5 max-w-[140px] leading-tight">{description}</p>
          </div>
        </div>
        
        {isConnected ? (
          <Badge className="bg-[#cafd00]/10 text-[#cafd00] border-none !text-[9px] font-black px-2 mt-2">SYNCED ✓</Badge>
        ) : (
          <Button onClick={handleConnect} size="sm" className="!px-3 !bg-[#262626] font-black tracking-widest text-[9px] text-[#cafd00]">CONNECT</Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="font-headline text-4xl font-black text-white italic tracking-tighter uppercase leading-none">
          ANABOLIC<br/>ENGINE
        </h1>
        <p className="text-[#adaaaa] font-body text-xs mt-2 w-full max-w-sm leading-relaxed">Lock into external telemetry platforms to enhance data resolution across the network.</p>
      </div>

      <div className="space-y-6">
        {/* Section: Wearables */}
        <div>
          <p className="font-label text-[10px] px-2 font-bold tracking-widest text-[#adaaaa] uppercase mb-3 border-b border-[#484847]/30 pb-2">WEARABLES</p>
          <div className="space-y-3">
            <IntegrationCard id="apple_health" name="Apple Health" icon="" description="Sync heart rate, calories, and daily steps globally." isConnected={status?.apple_health} />
            <IntegrationCard id="garmin" name="Garmin" icon="G" description="Direct API link for advanced HRV and sleep bio-metrics." isConnected={status?.garmin} />
            <IntegrationCard id="whoop" name="Whoop" icon="W" description="Recovery index automated uploads." isConnected={status?.whoop} />
          </div>
        </div>

        {/* Section: Nutrition */}
        <div>
          <p className="font-label text-[10px] px-2 font-bold tracking-widest text-[#adaaaa] uppercase mb-3 border-b border-[#484847]/30 pb-2">NUTRITION LAYERS</p>
          <div className="space-y-3">
            <IntegrationCard id="myfitnesspal" name="MyFitnessPal" icon="MF" description="Macro-nutrient mapping to metabolic stress algorithms." isConnected={status?.myfitnesspal} />
          </div>
        </div>
        
        {/* Gym Check-In Block */}
        <div>
          <p className="font-label text-[10px] px-2 font-bold tracking-widest text-[#adaaaa] uppercase mb-3 border-b border-[#484847]/30 pb-2">PHYSICAL ACCESS</p>
          <div className="bg-[#cafd00]/5 rounded-2xl border-2 border-[#cafd00]/30 p-6 flex flex-col items-center justify-center text-center shadow-[0_0_20px_rgba(202,253,0,0.05)]">
            <span className="material-symbols-outlined text-5xl text-[#cafd00] mb-3">qr_code_scanner</span>
            <h3 className="font-headline font-black text-xl italic uppercase tracking-tighter text-white">GYM CHECK-IN PORT</h3>
            <p className="font-body text-[10px] text-[#adaaaa] mt-1 mb-4">Deploy optical targeting to scan network barriers.</p>
            <Button fullWidth icon="document_scanner" className="font-black tracking-widest !bg-[#cafd00] !text-black shadow-[0_0_15px_rgba(202,253,0,0.2)]">SCAN NOW</Button>
          </div>
        </div>

      </div>
    </div>
  )
}
