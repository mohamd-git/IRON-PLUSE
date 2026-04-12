import { motion } from 'framer-motion'
import { useState } from 'react'
import Modal from './Modal'

interface Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
}

export default function ConfirmationDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'CONFIRM' }: Props) {
  const [clicks, setClicks] = useState(0)

  const handleConfirm = () => {
    if (clicks === 0) {
      setClicks(1)
      setTimeout(() => setClicks(0), 2000) // reset after 2s
      return
    }
    onConfirm()
    setClicks(0)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="flex flex-col items-center text-center">
        <span className="material-symbols-filled text-4xl text-[#ff7168] mb-4">warning</span>
        <h3 className="font-headline font-black uppercase text-white text-xl mb-2 tracking-wide">{title}</h3>
        <p className="font-body text-[#adaaaa] text-sm mb-6">{message}</p>
        
        <div className="flex gap-4 w-full">
          <button 
            className="flex-1 py-3 bg-[#262626] text-white font-label font-bold uppercase tracking-widest rounded-lg hover:bg-[#363636] transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          
          <motion.button 
            animate={clicks === 1 ? { x: [-5, 5, -5, 5, 0] } : {}}
            transition={{ duration: 0.4 }}
            className={`flex-1 py-3 font-label font-bold uppercase tracking-widest rounded-lg transition-colors ${clicks === 1 ? 'bg-[#ff7168] text-white shadow-[0_0_15px_rgba(255,113,104,0.4)]' : 'border border-[#ff7168] text-[#ff7168] hover:bg-[#ff7168]/10'}`}
            onClick={handleConfirm}
          >
            {clicks === 1 ? 'SURE?' : confirmText}
          </motion.button>
        </div>
      </div>
    </Modal>
  )
}
