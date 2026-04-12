import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import { authApi } from '../api/auth'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

const GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ?? ''

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

type FormData = z.infer<typeof schema>

export default function Login() {
  const navigate = useNavigate()
  const { setTokens, setUser } = useAuthStore()
  const [toastError, setToastError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  const onSubmit = async (data: FormData) => {
    setToastError(null)
    try {
      const res = await authApi.login({ email: data.email, password: data.password })
      const { access_token, refresh_token, user } = res.data as any
      setTokens(access_token, refresh_token)
      setUser(user)
      navigate('/')
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Invalid credentials. Check your email and password.'
      setToastError(typeof msg === 'string' ? msg : 'Login failed. Please try again.')
    }
  }

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => {
      ;(window as any).google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response: { credential: string }) => {
          setToastError(null)
          try {
            const res = await authApi.googleAuth(response.credential)
            const { access_token, refresh_token, user } = res.data as any
            setTokens(access_token, refresh_token)
            setUser(user)
            navigate('/')
          } catch (err: any) {
            setToastError(err?.response?.data?.detail || 'Google sign-in failed.')
          }
        },
      })
    }
    document.body.appendChild(script)
    return () => { document.body.removeChild(script) }
  }, [])

  const handleGoogleAuth = () => {
    if (!GOOGLE_CLIENT_ID) {
      setToastError('Google sign-in is not configured yet.')
      return
    }
    ;(window as any).google?.accounts.id.prompt()
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
            className="absolute top-20 bg-[#c00018] text-white px-6 py-3 rounded-lg shadow-lg font-body text-sm font-semibold border border-[#ff7168]"
          >
            {toastError}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-headline text-5xl font-black tracking-tighter uppercase text-white">SIGN IN</h1>
          <p className="text-[#adaaaa] font-body text-sm mt-2">Access your command center</p>
        </div>

        <div className="bg-[#1a1a1a] rounded-xl p-8 shadow-2xl border border-outline-variant/20">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              {...register('email')}
              placeholder="Email address"
              type="email"
              error={errors.email?.message}
            />
            <Input
              {...register('password')}
              placeholder="Password"
              type="password"
              error={errors.password?.message}
            />

            <div className="flex justify-center pt-2">
              <Link to="/forgot-password" className="text-xs font-label text-[#adaaaa] hover:text-white transition-colors">
                Forgot credentials?
              </Link>
            </div>

            <Button type="submit" loading={isSubmitting} fullWidth className="mt-4">
              SIGN IN
            </Button>
          </form>

          <div className="relative flex items-center py-6">
            <div className="flex-grow border-t border-[#484847]"></div>
            <span className="flex-shrink-0 mx-4 text-[10px] uppercase tracking-widest font-label font-semibold text-[#adaaaa]">
              Or continue with
            </span>
            <div className="flex-grow border-t border-[#484847]"></div>
          </div>

          <Button
            variant="outline"
            fullWidth
            onClick={handleGoogleAuth}
            className="gap-3 !font-body !normal-case !tracking-normal !font-semibold !px-4"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </Button>

          <p className="text-center text-xs font-label text-[#adaaaa] mt-8">
            No account?{' '}
            <Link to="/sign-up" className="text-[#CCFF00] font-bold hover:underline underline-offset-2">
              ENLIST NOW
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}