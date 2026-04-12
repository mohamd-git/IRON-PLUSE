import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import { authApi } from '../api/auth'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

const schema = z.object({
  fullName: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type FormData = z.infer<typeof schema>

export default function Register() {
  const navigate = useNavigate()
  const { setTokens, setUser } = useAuthStore()
  const [toastError, setToastError] = useState<string | null>(null)
  
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  const passwordVal = watch('password', '')

  // Password Strength Logic
  const strength = useMemo(() => {
    if (!passwordVal) return 0
    let s = 1 // Has text but < 8 is weak
    if (passwordVal.length >= 8) {
      if (/[A-Z]/.test(passwordVal)) s++
      if (/\d/.test(passwordVal)) s++
      if (/[^a-zA-Z\d]/.test(passwordVal)) s++
    }
    return Math.min(s, 4)
  }, [passwordVal])

  const strengthLabels = ['NONE', 'WEAK', 'FAIR', 'STRONG', 'ELITE']
  const strengthPercentage = strength === 0 ? 0 : (strength / 4) * 100

  const onSubmit = async (data: FormData) => {
    setToastError(null)
    try {
      const res = await authApi.register({
        email: data.email,
        username: data.email.split('@')[0], // Extract basic username, they usually configure this later
        display_name: data.fullName,
        password: data.password
      })
      
      setTokens(res.data.access_token, res.data.refresh_token)
      setUser(res.data.user)
      navigate('/onboarding')
    } catch (err: any) {
      setToastError(err.response?.data?.detail || 'Registration failed. Try again.')
      setTimeout(() => setToastError(null), 3000)
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 bg-[#0e0e0e]">
      {/* Top Left Logo */}
      <div className="absolute top-6 left-6">
        <Link to="/" className="font-headline text-xl font-black text-[#CCFF00] italic tracking-tighter">
          IRON PULSE
        </Link>
      </div>

      {/* Floating Toast Error */}
      <AnimatePresence>
        {toastError && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 bg-[#c00018] text-white px-6 py-3 rounded-lg shadow-lg font-body text-sm font-semibold border border-[#ff7168] z-50"
          >
            {toastError}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-sm mt-12 mb-6">
        <div className="text-center mb-8">
          <h1 className="font-headline text-7xl font-black tracking-tighter uppercase italic text-white">ENLIST</h1>
          <p className="text-[#adaaaa] font-body text-sm mt-2">Begin your tactical performance journey</p>
        </div>

        <div className="bg-[#1a1a1a] rounded-xl p-8 shadow-2xl border border-outline-variant/20">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input 
              {...register('fullName')}
              placeholder="Full Name"
              error={errors.fullName?.message}
            />
            <Input 
              {...register('email')}
              placeholder="Email address"
              type="email"
              error={errors.email?.message}
            />
            
            <div className="space-y-1.5">
              <Input 
                {...register('password')}
                placeholder="Password"
                type="password"
                error={errors.password?.message}
              />
              
              {/* Password Strength Indicator */}
              <div className="pt-1">
                <div className="h-1.5 w-full bg-[#262626] rounded-full overflow-hidden flex">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${strengthPercentage}%` }}
                    transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                    className="h-full bg-[#cafd00]"
                  />
                </div>
                {strength > 0 && (
                  <p className="text-[10px] font-label font-bold text-right mt-1 tracking-widest" style={{ color: strength === 4 ? '#cafd00' : '#adaaaa' }}>
                    {strengthLabels[strength]}
                  </p>
                )}
              </div>
            </div>

            <Input 
              {...register('confirmPassword')}
              placeholder="Confirm Password"
              type="password"
              error={errors.confirmPassword?.message}
            />
            
            <Button type="submit" loading={isSubmitting} fullWidth className="mt-6">
              ENLIST NOW
            </Button>
          </form>

          <p className="text-center text-xs font-label text-[#adaaaa] mt-8">
            Already active?{' '}
            <Link to="/sign-in" className="text-[#CCFF00] font-bold hover:underline underline-offset-2">
              SIGN IN
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
