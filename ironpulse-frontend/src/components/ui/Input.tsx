import { type InputHTMLAttributes, useState, forwardRef } from 'react'
import { motion } from 'framer-motion'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, type = 'text', icon, className = '', ...props }, ref) => {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  
  const currentType = isPassword && showPassword ? 'text' : type

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label className="text-xs font-label font-semibold tracking-wider text-white">{label}</label>}
      <div className="relative">
        <input
          ref={ref}
          type={currentType}
          className={`w-full bg-[#262626] border ${error ? 'border-[#ff7168]' : 'border-[#484847]'} rounded-lg px-4 py-3 text-white placeholder-[#adaaaa] font-body focus:border-[#cafd00] focus:shadow-[0_0_0_2px_rgba(202,253,0,0.12)] outline-none transition-all duration-150 ${className}`}
          {...props}
        />
        {isPassword && !icon ? (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#adaaaa] hover:text-white transition-colors flex items-center justify-center p-1"
            onClick={() => setShowPassword(!showPassword)}
          >
            <motion.span
              key={showPassword ? 'visible' : 'hidden'}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="material-symbols-outlined text-xl"
            >
              {showPassword ? 'visibility_off' : 'visibility'}
            </motion.span>
          </button>
        ) : icon ? (
          <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-[#adaaaa] text-xl pointer-events-none">
            {icon}
          </span>
        ) : null}
      </div>
      {error && <span className="text-xs text-[#ff7168] font-label">{error}</span>}
    </div>
  )
})

Input.displayName = 'Input'
export default Input
