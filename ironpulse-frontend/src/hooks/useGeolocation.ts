import { useState, useEffect } from 'react'

interface GeoState {
  latitude: number | null
  longitude: number | null
  error: string | null
  loading: boolean
}

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: true
  })

  useEffect(() => {
    // Check sessionStorage cache first
    const cached = sessionStorage.getItem('ironpulse_geo')
    if (cached) {
      try {
        const data = JSON.parse(cached)
        setState({ latitude: data.lat, longitude: data.lng, error: null, loading: false })
        return
      } catch {} // ignore bad cache
    }

    if (!navigator.geolocation) {
      setState(s => ({ ...s, error: 'Geolocation not supported', loading: false }))
      return
    }

    const onSuccess = (position: GeolocationPosition) => {
      const lat = position.coords.latitude
      const lng = position.coords.longitude
      sessionStorage.setItem('ironpulse_geo', JSON.stringify({ lat, lng }))
      setState({
        latitude: lat,
        longitude: lng,
        error: null,
        loading: false
      })
    }

    const onError = (error: GeolocationPositionError) => {
      setState({
        latitude: null,
        longitude: null,
        error: error.message,
        loading: false
      })
    }

    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 minutes
    })

  }, [])

  return state
}
