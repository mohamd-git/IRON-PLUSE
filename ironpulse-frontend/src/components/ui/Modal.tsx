import { type ReactNode, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface ModalProps { 
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'full' 
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  // Handle Escape Key and Focus Trap theoretically
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => {
        document.body.style.overflow = ''
        window.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [isOpen, onClose])

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    full: 'max-w-[95vw] min-h-[90vh]'
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md" 
            onClick={onClose} 
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div 
            ref={modalRef}
            initial={{ scale: 0.95, y: 20 }} 
            animate={{ scale: 1, y: 0 }} 
            exit={{ scale: 0.95, y: 20 }} 
            transition={{ type: 'spring', damping: 25, stiffness: 300 }} 
            className={`relative w-full ${sizeClasses[size]} bg-[#1a1a1a] border border-white/5 rounded-xl p-6 shadow-2xl max-h-[90vh] flex flex-col`}
          >
            {title && (
              <div className="flex items-center justify-between mb-4 shrink-0">
                <h2 className="font-headline text-lg font-black italic tracking-widest text-white uppercase">{title}</h2>
              </div>
            )}
            
            <button 
              onClick={onClose} 
              className="absolute top-4 right-4 text-[#adaaaa] hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>

            <div className="overflow-y-auto pr-2 custom-scrollbar flex-1">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
