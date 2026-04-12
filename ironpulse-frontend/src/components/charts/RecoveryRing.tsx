import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface Props { 
  percentage: number
  size?: number
  label: string 
}

export default function RecoveryRing({ percentage, size = 128, label }: Props) {
  const [animatedPct, setAnimatedPct] = useState(0)

  useEffect(() => {
    // Small delay to trigger animation after mount
    const timeout = setTimeout(() => {
      setAnimatedPct(Math.min(Math.max(percentage, 0), 100))
    }, 100)
    return () => clearTimeout(timeout)
  }, [percentage])

  const strokeWidth = size * 0.08
  const radius = (size - strokeWidth) / 2
  const center = size / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (animatedPct / 100) * circumference

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
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
          filter="drop-shadow(0 0 6px rgba(202,253,0,0.5))"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-headline font-black text-white leading-none" style={{ fontSize: size * 0.25 }}>
          {Math.round(animatedPct)}%
        </span>
        <span className="font-label uppercase tracking-widest text-[#adaaaa] mt-1" style={{ fontSize: size * 0.07 }}>
          {label}
        </span>
      </div>
    </div>
  )
}
