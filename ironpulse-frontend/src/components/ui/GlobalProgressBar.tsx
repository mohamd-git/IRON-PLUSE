import { useEffect, useState } from 'react'

export default function GlobalProgressBar() {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let interval: number

    const handleStart = () => {
      setLoading(true)
      setProgress(10)
      interval = window.setInterval(() => {
        setProgress(p => Math.min(p + Math.random() * 10, 85))
      }, 300)
    }

    const handleStop = () => {
      setProgress(100)
      clearInterval(interval)
      setTimeout(() => {
        setLoading(false)
        setProgress(0)
      }, 300)
    }

    window.addEventListener('ironpulse:api_start', handleStart)
    window.addEventListener('ironpulse:api_stop', handleStop)

    return () => {
      window.removeEventListener('ironpulse:api_start', handleStart)
      window.removeEventListener('ironpulse:api_stop', handleStop)
      clearInterval(interval)
    }
  }, [])

  if (!loading) return null

  return (
    <div className="fixed top-0 left-0 w-full h-[2px] z-[99999] pointer-events-none">
      <div 
        className="h-full bg-[#cafd00] transition-all duration-300 ease-out shadow-[0_0_10px_rgba(202,253,0,0.8)]"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
