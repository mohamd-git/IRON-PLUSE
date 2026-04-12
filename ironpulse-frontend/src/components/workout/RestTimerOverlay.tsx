import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  isOpen: boolean
  onClose: () => void
  duration?: number // in seconds, default 90
}

export default function RestTimerOverlay({ isOpen, onClose, duration = 90 }: Props) {
  const [timeLeft, setTimeLeft] = useState(duration)

  useEffect(() => {
    setTimeLeft(duration) // reset on open
    if (!isOpen) return

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          onClose()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isOpen, duration, onClose])

  // SVG parameters
  const size = 280
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const center = size / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (timeLeft / duration) * circumference

  // Format mm:ss
  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const timeString = `${mins}:${secs.toString().padStart(2, '0')}`

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4"
        >
          <span className="font-label uppercase tracking-[0.2em] text-[#adaaaa] mb-8">Rest</span>

          <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
              <circle 
                cx={center} 
                cy={center} 
                r={radius} 
                fill="none" 
                stroke="#262626" 
                strokeWidth={strokeWidth} 
              />
              <motion.circle 
                cx={center} 
                cy={center} 
                r={radius} 
                fill="none" 
                stroke="#cafd00" 
                strokeWidth={strokeWidth} 
                strokeLinecap="round"
                strokeDasharray={circumference}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1, ease: 'linear' }}
                filter="drop-shadow(0 0 10px rgba(202,253,0,0.4))"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-headline font-black text-white text-7xl tracking-tighter">
                {timeString}
              </span>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="mt-12 text-[#adaaaa] hover:text-white font-label text-xs uppercase tracking-widest transition-colors"
          >
            Skip Rest
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
