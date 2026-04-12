import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { authApi } from '../api/auth'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

type Step = 'email' | 'code' | 'password' | 'done'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setError(null)
    setLoading(true)
    try {
      await authApi.forgotPassword(email.trim())
      setStep('code')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to send reset code. Check your email.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault()
    if (code.trim().length < 4) { setError('Enter the full reset code.'); return }
    setError(null)
    setStep('password')
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return }
    setError(null)
    setLoading(true)
    try {
      await authApi.resetPassword({ email, code, new_password: newPassword })
      setStep('done')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Reset failed. The code may be expired or invalid.')
    } finally {
      setLoading(false)
    }
  }

  const stepTitles: Record<Step, string> = {
    email: 'RESET ACCESS',
    code: 'ENTER CODE',
    password: 'NEW PASSWORD',
    done: 'ACCESS RESTORED',
  }

  const stepSubs: Record<Step, string> = {
    email: 'Enter your email to receive a reset code.',
    code: `A 6-digit code was sent to ${email}`,
    password: 'Set your new secure password.',
    done: 'Your password has been reset successfully.',
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 bg-[#0e0e0e]">
      <div className="absolute top-6 left-6">
        <Link to="/sign-in" className="font-headline text-xl font-black text-[#CCFF00] italic tracking-tighter">
          IRON PULSE
        </Link>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2 mb-8">
        {(['email', 'code', 'password'] as Step[]).map((s, i) => (
          <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${
            step === s ? 'w-8 bg-[#cafd00]' :
            ['email', 'code', 'password'].indexOf(step) > i ? 'w-4 bg-[#cafd00]/60' :
            'w-4 bg-[#484847]'
          }`} />
        ))}
      </div>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-headline text-5xl font-black tracking-tighter uppercase text-white">{stepTitles[step]}</h1>
          <p className="text-[#adaaaa] font-body text-sm mt-2">{stepSubs[step]}</p>
        </div>

        <div className="bg-[#1a1a1a] rounded-xl p-8 shadow-2xl border border-[#484847]/30">
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-[#ff7168] font-body text-xs font-semibold mb-4 text-center bg-[#c00018]/10 border border-[#c00018]/30 rounded-lg px-4 py-2"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {step === 'email' && (
              <motion.form key="email" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleSendCode} className="space-y-4">
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
                <Button type="submit" loading={loading} fullWidth>SEND RESET CODE</Button>
              </motion.form>
            )}

            {step === 'code' && (
              <motion.form key="code" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleVerifyCode} className="space-y-4">
                <Input
                  type="text"
                  placeholder="6-digit reset code"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  className="tracking-[0.4em] text-center text-xl font-headline"
                />
                <Button type="submit" fullWidth>VERIFY CODE</Button>
                <button type="button" onClick={() => { setStep('email'); setError(null) }} className="w-full text-center text-xs font-label text-[#adaaaa] hover:text-white transition-colors">
                  Resend code
                </button>
              </motion.form>
            )}

            {step === 'password' && (
              <motion.form key="password" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleResetPassword} className="space-y-4">
                <Input
                  type="password"
                  placeholder="New password (min 8 chars)"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                />
                <Input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
                <Button type="submit" loading={loading} fullWidth>RESET PASSWORD</Button>
              </motion.form>
            )}

            {step === 'done' && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#cafd00]/10 border border-[#cafd00]/30 flex items-center justify-center mx-auto">
                  <span className="material-symbols-filled text-[#cafd00] text-3xl">check_circle</span>
                </div>
                <p className="text-[#adaaaa] font-body text-sm">You can now sign in with your new password.</p>
                <Button fullWidth onClick={() => navigate('/sign-in')}>SIGN IN NOW</Button>
              </motion.div>
            )}
          </AnimatePresence>

          {step !== 'done' && (
            <p className="text-center text-xs font-label text-[#adaaaa] mt-6">
              Remember it?{' '}
              <Link to="/sign-in" className="text-[#CCFF00] font-bold hover:underline underline-offset-2">SIGN IN</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
