import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { useGeolocation } from '../hooks/useGeolocation'
import api from '../api/client'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'

import L from 'leaflet'

const userIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: '<div style="width:16px; height:16px; background:#cafd00; border-radius:50%; box-shadow: 0 0 15px #cafd00; border: 2px solid #0e0e0e;" class="animate-pulse"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
})

const gymIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: '<div style="width:24px; height:24px; background:#1a1a1a; display:flex; align-items:center; justify-content:center; border-radius:50%; border: 2px solid #cafd00;"><span class="material-symbols-filled" style="color:#cafd00; font-size:14px;">fitness_center</span></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
})

const FILTERS = ['ALL', '24H ACCESS', 'VIP ONLY', 'POWERLIFTING', 'CROSSFIT']

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => { map.setView([lat, lng], 13) }, [lat, lng, map])
  return null
}

export default function GymLocator() {
  const { latitude, longitude, error, loading: geoLoading } = useGeolocation()
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const hasLocation = latitude !== null && longitude !== null

  const { data: gyms } = useQuery({
    queryKey: ['gyms', activeFilter, latitude, longitude],
    enabled: hasLocation,
    queryFn: async () => {
      try {
        const res = await api.get(`/gyms/nearby?lat=${latitude}&lng=${longitude}&radius_km=10`)
        return res.data
      } catch {
        return [
          { id: '1', name: 'Iron Forge Barbell', distance_km: 1.2, rating: 4.9, hours: '24/7', features: ['POWERLIFTING'], lat: latitude! + 0.01, lng: longitude! + 0.01, image: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=200' },
          { id: '2', name: 'Apex Elite HQ', distance_km: 3.5, rating: 5.0, hours: '5AM-11PM', features: ['VIP ONLY'], lat: latitude! - 0.015, lng: longitude! - 0.02, image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200' },
          { id: '3', name: 'Titan Crossfit', distance_km: 5.8, rating: 4.7, hours: '6AM-10PM', features: ['CROSSFIT'], lat: latitude! + 0.02, lng: longitude! - 0.01, image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200' },
          { id: '4', name: 'Metro Iron', distance_km: 8.1, rating: 4.5, hours: '24/7', features: ['ALL'], lat: latitude! - 0.025, lng: longitude! + 0.015, image: 'https://images.unsplash.com/photo-1517836357463-dcf37b6cf9bd?w=200' },
        ]
      }
    }
  })

  if (geoLoading) {
    return <div className="p-6 text-white text-center font-headline animate-pulse">Acquiring satellite lock...</div>
  }

  if (error || !hasLocation) {
    return (
      <div className="p-6 text-white text-center flex flex-col items-center justify-center pt-24">
        <span className="material-symbols-outlined text-4xl mb-4 text-[#ff7168]">location_off</span>
        <p className="font-headline font-bold uppercase tracking-widest text-sm text-[#adaaaa]">Enable location tracking to find active network hubs.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h1 className="font-headline text-3xl font-black text-white italic tracking-tighter uppercase leading-none mb-4">
          NETWORK HUBS
        </h1>

        <div className="flex items-center bg-[#1a1a1a] border border-[#484847]/40 rounded-xl px-4 py-3">
          <span className="material-symbols-outlined text-[#adaaaa]">search</span>
          <input
            type="text"
            placeholder="Search gym designation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-white font-body text-sm px-3 outline-none placeholder-[#484847]"
          />
          <button type="button" className="text-[#cafd00] transition-colors">
            <span className="material-symbols-outlined text-xl">my_location</span>
          </button>
        </div>
      </div>

      <div className="h-64 bg-[#262626] rounded-2xl overflow-hidden border border-[#484847]/40 relative z-0">
        <MapContainer center={[latitude!, longitude!]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OSM</a> &copy; <a href='https://carto.com/'>CARTO</a>"
          />
          <RecenterMap lat={latitude!} lng={longitude!} />
          <Marker position={[latitude!, longitude!]} icon={userIcon}>
            <Popup className="custom-popup">Operator Position</Popup>
          </Marker>
          {gyms?.map((gym: any) => (
            <Marker key={gym.id} position={[gym.lat, gym.lng]} icon={gymIcon}>
              <Popup>
                <div className="font-headline text-xs font-bold">{gym.name}</div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        <div className="absolute inset-0 border-[3px] border-[#0e0e0e] rounded-2xl pointer-events-none z-[400]" />
      </div>

      <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar -mx-4 px-4 sticky top-0 bg-[#0e0e0e] pt-2 z-10 border-b border-[#0e0e0e]">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setActiveFilter(f)} className={`whitespace-nowrap px-4 py-2 rounded-full font-headline font-bold text-[10px] tracking-widest uppercase transition-colors shrink-0 ${activeFilter === f ? 'bg-[#cafd00] text-black shadow-[0_0_15px_rgba(202,253,0,0.3)]' : 'bg-[#1a1a1a] border border-[#484847]/50 text-[#adaaaa]'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-4 pb-10">
        {gyms?.filter((gym: any) =>
          !searchQuery || gym.name.toLowerCase().includes(searchQuery.toLowerCase())
        ).map((gym: any) => (
          <div key={gym.id} className="bg-[#1a1a1a] border border-[#484847]/40 rounded-2xl p-4 flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-20 h-20 bg-[#262626] rounded-xl overflow-hidden mt-1">
                <img src={gym.image} alt={gym.name} className="w-full h-full object-cover mix-blend-luminosity grayscale opacity-60" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-headline font-black text-lg text-white uppercase truncate mb-1">{gym.name}</h3>
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-label text-xs font-bold text-[#cafd00]">{gym.distance_km} KM AWAY</span>
                  <span className="font-label text-xs text-[#adaaaa] flex items-center gap-0.5">
                    <span className="material-symbols-filled text-[12px] text-yellow-500">star</span> {gym.rating}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge className="!bg-[#262626] !text-[#adaaaa] !border-none !text-[9px]">{gym.hours}</Badge>
                  {gym.features.map((f: string) => (
                    <Badge key={f} className="!bg-[#cafd00]/10 !text-[#cafd00] !border-[#cafd00]/30 !text-[9px]">{f}</Badge>
                  ))}
                </div>
              </div>
            </div>
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${gym.lat},${gym.lng}`} target="_blank" rel="noreferrer" className="w-full">
              <Button fullWidth icon="directions_car" variant="outline" className="!bg-[#262626] border-none text-[#cafd00] mb-0 tracking-widest text-xs font-black">
                GET DIRECTIONS
              </Button>
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
