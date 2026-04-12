import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '../../store/toastStore'
import type { ToastMessage } from '../../store/toastStore'
import { Link } from 'react-router-dom'

export default function ToastProvider() {
  const { toasts, dismissToast } = useToast()

  return (
    <div className="fixed top-4 right-4 sm:top-6 sm:right-6 md:right-8 z-[9999] flex flex-col gap-3 items-end pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={() => dismissToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function ToastCard({ toast, onDismiss }: { toast: ToastMessage, onDismiss: () => void }) {
  // Config variants
  const variants = {
    success: { border: 'border-l-4 border-l-[#cafd00]', icon: 'check_circle', color: 'text-[#cafd00]' },
    error: { border: 'border-l-4 border-l-[#ff7168]', icon: 'error', color: 'text-[#ff7168]' },
    info: { border: 'border-l-4 border-l-[#60a5fa]', icon: 'info', color: 'text-[#60a5fa]' },
    pr: { border: 'border border-[#cafd00] bg-[#cafd00]/10', icon: 'emoji_events', color: 'text-[#cafd00]' },
    challenge: { border: 'border border-[#ff7168] bg-[#ff7168]/10', icon: 'bolt', color: 'text-[#ff7168]' },
    message: { border: 'border-l-4 border-l-white', icon: 'chat', color: 'text-white' }
  }

  const v = variants[toast.type] || variants.info

  // Physics animation maps desktop (slide right) mobile (slide down)
  const isMobile = window.innerWidth < 640
  const initialAnim = isMobile ? { opacity: 0, y: -50 } : { opacity: 0, x: 50 }
  const exitAnim = isMobile ? { opacity: 0, y: -50, scale: 0.9 } : { opacity: 0, x: 50, scale: 0.9 }

  return (
    <motion.div
      layout
      initial={initialAnim}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      exit={exitAnim}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`relative flex items-start gap-4 p-4 min-w-[280px] max-w-sm rounded-xl bg-[#1a1a1a] shadow-2xl pointer-events-auto ${v.border}`}
    >
      {/* Icon */}
      {toast.type !== 'message' && (
        <span className={`material-symbols-filled text-2xl ${v.color}`}>{v.icon}</span>
      )}

      {/* Message Type (Custom Layouts) */}
      <div className="flex-1 pr-6 pb-1">
        
        {toast.type === 'pr' && (
          <div className="flex flex-col gap-1">
            <h4 className="font-headline font-black italic tracking-widest text-[#cafd00]">NEW PR 🏆</h4>
            <p className="font-label text-sm text-white">{toast.message}</p>
            {toast.metadata?.delta && (
              <span className="text-xs text-[#cafd00] mt-1">{toast.metadata.delta} 🔥</span>
            )}
            <Link to="/pr-celebration" onClick={onDismiss} className="text-xs uppercase tracking-widest text-[#cafd00] underline mt-2 block">
              VIEW
            </Link>
          </div>
        )}

        {toast.type === 'challenge' && (
          <div className="flex flex-col gap-1">
            <h4 className="font-headline font-black italic tracking-widest text-[#ff7168]">⚡ BATTLE CHALLENGE</h4>
            <p className="font-label text-sm text-white">{toast.message}</p>
            <div className="flex gap-3 mt-3">
              <button className="text-xs bg-[#cafd00] text-black px-4 py-1.5 rounded font-black font-headline uppercase" onClick={() => {
                // Mock Accept Logic -> can call REST API here matching id
                onDismiss()
              }}>Accept</button>
              <button className="text-xs text-[#adaaaa] px-2 uppercase tracking-wide hover:text-white transition" onClick={onDismiss}>Dismiss</button>
            </div>
          </div>
        )}

        {toast.type === 'message' && (
          <div className="flex gap-3">
             <div className="w-10 h-10 rounded-full bg-[#262626] border border-white/10 shrink-0 overflow-hidden flex items-center justify-center">
                <span className="material-symbols-outlined text-[#adaaaa]">person</span>
             </div>
             <div className="flex flex-col">
               <span className="font-headline font-bold text-sm text-white">{toast.metadata?.sender || 'Agent'}</span>
               <p className="text-xs text-[#adaaaa] font-body line-clamp-2 mt-0.5">{toast.message}</p>
               <Link to={`/comms/${toast.metadata?.senderId || '1'}`} onClick={onDismiss} className="text-[10px] text-white underline tracking-widest mt-2 uppercase opacity-80 hover:opacity-100">Reply</Link>
             </div>
          </div>
        )}

        {/* Standard text for success/error/info */}
        {!['pr', 'challenge', 'message'].includes(toast.type) && (
          <p className="font-body text-sm text-white mt-0.5">{toast.message}</p>
        )}
      </div>

      {/* Dismiss Button */}
      <button 
        onClick={onDismiss}
        className="absolute top-4 right-4 text-[#767575] hover:text-white transition-colors"
      >
        <span className="material-symbols-outlined text-lg">close</span>
      </button>
    </motion.div>
  )
}
