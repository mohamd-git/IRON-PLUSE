import { motion } from 'framer-motion'

interface ToggleProps { 
  checked: boolean
  onChange: (v: boolean) => void
  label?: string 
}

export default function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <button 
        type="button" 
        onClick={() => onChange(!checked)} 
        className={`relative flex items-center w-12 h-6 rounded-full transition-colors duration-200 px-0.5 ${checked ? 'bg-[#cafd00]' : 'bg-[#484847]'}`}
      >
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 700, damping: 40 }}
          className={`w-5 h-5 bg-white rounded-full shadow-sm ${checked ? 'ml-auto' : 'mr-auto'}`}
        />
      </button>
      {label && <span className="text-sm font-body text-[#adaaaa]">{label}</span>}
    </label>
  )
}
