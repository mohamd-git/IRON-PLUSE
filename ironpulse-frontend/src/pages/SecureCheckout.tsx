import { useState, useEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import api from '../api/client'
import TopHeader from '../components/layout/TopHeader'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function SecureCheckout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, setUser } = useAuthStore()
  
  // Read state or fallback
  const plan = location.state?.plan || 'monthly'
  const price = location.state?.price || 39
  
  const tax = price * 0.06
  const total = price + tax

  const METHODS = ['Touch\'n Go', 'Boost', 'FPX', 'Credit Card']
  const [selectedMethod, setSelectedMethod] = useState('Touch\'n Go')
  const [isProcessing, setIsProcessing] = useState(false)

  // RHF for credit card
  const { register, handleSubmit, formState: { errors, isValid } } = useForm({ mode: 'onChange' })

  // Intercept gateway return
  useEffect(() => {
    const paymentId = searchParams.get('payment_id')
    const verifyPayment = async () => {
      if (paymentId) {
        setIsProcessing(true)
        try {
          // Await real verification endpoint
          // await api.get(`/payments/verify/${paymentId}`)
          
          if (user) {
            setUser({ ...user, role: 'vip' })
          }
          navigate('/vip-dashboard')
        } catch {
          // Handle error
        } finally {
          setIsProcessing(false)
        }
      }
    }
    verifyPayment()
  }, [searchParams, navigate, setUser, user])

  const onCompleteOrder = async (data?: any) => {
    setIsProcessing(true)
    try {
      // Real API POST structure
      // const res = await api.post('/payments/initiate', { plan, method: selectedMethod, ...data })
      // window.location.href = res.data.payment_url

      // Mock redirect loop mapping gateway success param back to ourselves
      setTimeout(() => {
        setIsProcessing(false)
        navigate(`/checkout?payment_id=mock_7749&success=true`, { replace: true })
      }, 1500)
    } catch {
      setIsProcessing(false)
    }
  }

  return (
    <div className="bg-[#0e0e0e] min-h-screen pb-32">
      <TopHeader 
        showBack 
        title="SECURE CHECKOUT" 
        rightContent={<span className="material-symbols-filled text-[#cafd00] animate-pulse">lock</span>} 
      />
      
      <main className="w-full max-w-lg mx-auto pt-[80px] px-4 space-y-6">
        
        {/* Order Summary */}
        <div className="bg-[#1a1a1a] rounded-3xl border border-[#484847]/40 p-6 flex flex-col items-center">
          <Badge className="bg-[#d4af37]/10 text-[#d4af37] border-none tracking-widest font-bold mb-4 font-label">ORDER SUMMARY</Badge>
          <h2 className="font-headline font-black text-3xl text-white uppercase italic tracking-tighter mb-6">VIP ELITE {plan}</h2>
          
          <div className="w-full space-y-3 font-body text-sm border-b border-[#484847]/40 pb-4 mb-4">
            <div className="flex justify-between items-center text-[#adaaaa]">
              <span>Base Subtotal</span>
              <span>RM {price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-[#adaaaa]">
              <span>SST (6%)</span>
              <span>RM {tax.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center w-full">
            <span className="font-headline font-bold text-white uppercase tracking-wider">TOTAL</span>
            <span className="font-headline font-black text-2xl text-[#cafd00] tracking-tighter drop-shadow-[0_0_10px_rgba(202,253,0,0.2)]">RM {total.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Selection */}
        <div>
           <p className="font-label text-[10px] tracking-widest text-[#adaaaa] font-bold uppercase mb-3 px-1">Select Payment Architecture</p>
           <div className="grid grid-cols-2 gap-3">
             {METHODS.map(m => (
               <button 
                 key={m}
                 onClick={() => setSelectedMethod(m)}
                 className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-center gap-2 ${selectedMethod === m ? 'border-[#cafd00] bg-[#cafd00]/5 text-[#cafd00]' : 'border-[#484847]/40 bg-[#1a1a1a] text-[#adaaaa] hover:bg-[#262626]'}`}
               >
                 <span className={`material-symbols-outlined text-2xl ${selectedMethod === m ? 'font-variation-fill' : ''}`}>
                   {m === 'Credit Card' ? 'credit_card' : 'account_balance_wallet'}
                 </span>
                 <span className="font-headline font-bold tracking-wider text-xs uppercase">{m}</span>
               </button>
             ))}
           </div>
        </div>

        {/* Credit Card Form Expand */}
        <AnimatePresence>
          {selectedMethod === 'Credit Card' && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
               <form className="pt-2 space-y-4" onSubmit={handleSubmit(onCompleteOrder)} id="cc-form">
                 <div className="bg-[#1a1a1a] p-4 rounded-2xl border border-[#484847]/40 space-y-4">
                   <div className="space-y-1">
                     <label className="text-[10px] uppercase tracking-widest text-[#adaaaa] font-bold">Card Number</label>
                     <input {...register('cardNumber', { required: true, pattern: /^[\d\s]{15,19}$/ })} className="w-full bg-[#0e0e0e] border border-[#484847] rounded-xl px-4 py-3 text-white font-body outline-none focus:border-[#cafd00]" placeholder="0000 0000 0000 0000" />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                       <label className="text-[10px] uppercase tracking-widest text-[#adaaaa] font-bold">Expiry</label>
                       <input {...register('expiry', { required: true })} className="w-full bg-[#0e0e0e] border border-[#484847] rounded-xl px-4 py-3 text-white font-body outline-none focus:border-[#cafd00]" placeholder="MM/YY" />
                     </div>
                     <div className="space-y-1">
                       <label className="text-[10px] uppercase tracking-widest text-[#adaaaa] font-bold">CVV</label>
                       <input {...register('cvv', { required: true })} type="password" maxLength={4} className="w-full bg-[#0e0e0e] border border-[#484847] rounded-xl px-4 py-3 text-white font-body outline-none focus:border-[#cafd00]" placeholder="123" />
                     </div>
                   </div>
                 </div>
               </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Triggers */}
        <div className="fixed bottom-0 left-0 w-full bg-gradient-to-t from-[#0e0e0e] via-[#0e0e0e]/90 to-transparent pt-12 pb-6 px-4 z-40 border-t border-[#484847]/30">
           <div className="max-w-lg mx-auto space-y-4">
             <Button 
               fullWidth 
               size="lg"
               onClick={selectedMethod === 'Credit Card' ? handleSubmit(onCompleteOrder) : () => onCompleteOrder()}
               disabled={isProcessing || (selectedMethod === 'Credit Card' && !isValid)}
               variant="primary"
               className="!bg-[#cafd00] !text-black shadow-[0_0_20px_rgba(202,253,0,0.15)] font-black tracking-widest text-lg"
             >
               {isProcessing ? 'PROCESSING...' : 'COMPLETE ORDER'}
             </Button>
             
             {/* Trust Badges */}
             <div className="flex justify-center gap-6 opacity-60">
                <div className="flex items-center gap-1"><span className="material-symbols-filled text-[#cafd00] text-sm">verified_user</span><span className="text-[8px] font-label font-bold text-white tracking-widest">VERIFIED</span></div>
                <div className="flex items-center gap-1"><span className="material-symbols-filled text-[#cafd00] text-sm">lock</span><span className="text-[8px] font-label font-bold text-white tracking-widest">256-BIT SSL</span></div>
                <div className="flex items-center gap-1"><span className="material-symbols-filled text-[#cafd00] text-sm">check_circle</span><span className="text-[8px] font-label font-bold text-white tracking-widest">ENCRYPTED</span></div>
             </div>
           </div>
        </div>

      </main>
    </div>
  )
}
