import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import type { HTMLMotionProps } from 'framer-motion'

interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'primary' | 'outline' | 'destructive' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
  icon?: string
  children: ReactNode
}

const variants = {
  primary: 'bg-[#cafd00] text-black hover:brightness-110 border border-[#cafd00]',
  outline: 'border border-[#484847] text-white hover:bg-[#1a1a1a]',
  destructive: 'border border-[#c00018] text-[#ff7168] hover:bg-[#c00018] hover:text-white',
  ghost: 'text-[#adaaaa] hover:text-white hover:bg-[#1a1a1a] border border-transparent',
}

const sizes = {
  sm: 'text-xs px-4 py-2',
  md: 'text-sm px-6 py-3',
  lg: 'text-base px-8 py-4',
}

export default function Button({ 
  variant = 'primary', 
  size = 'md', 
  loading,
  fullWidth,
  icon, 
  children, 
  className = '', 
  disabled,
  ...props 
}: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      whileHover={{ 
        scale: 1.02, 
        boxShadow: variant === 'primary' ? '0 4px 20px rgba(202,253,0,0.25)' : 'none' 
      }}
      className={`relative overflow-hidden inline-flex items-center justify-center gap-2 font-headline font-black uppercase tracking-widest rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {/* Ripple Mock */}
      {variant === 'primary' && (
        <span className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.8)_0%,transparent_60%)] opacity-0 active:opacity-100 transition-opacity duration-150 pointer-events-none active:scale-150 transform scale-50" />
      )}
      
      {loading && (
        <span className="material-symbols-outlined animate-spin text-[18px] relative z-10">progress_activity</span>
      )}
      {!loading && icon && (
        <span className="material-symbols-outlined text-[18px] relative z-10">{icon}</span>
      )}
      <span className="relative z-10">{children}</span>
    </motion.button>
  )
}
