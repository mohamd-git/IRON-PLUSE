import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../api/client'
import Button from '../components/ui/Button'

type Status = 'verifying' | 'success' | 'error'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [status, setStatus] = useState<Status>('verifying')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('No verification token provided.'); return }
    api.get(`/auth/verify-email?token=${token}`)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error')
        setMessage(err?.response?.data?.detail || 'Verification link is invalid or expired.')
      })
  }, [token])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[#0e0e0e] text-white">
      <div className="w-full max-w-sm text-center space-y-6">
        <Link to="/" className="font-headline text-xl font-black text-[#CCFF00] italic tracking-tighter block mb-8">
          IRON PULSE
        </Link>

        {status === 'verifying' && (
          <>
            <span className="material-symbols-outlined text-6xl text-[#cafd00] animate-spin block mx-auto">progress_activity</span>
            <h1 className="font-headline text-4xl font-black tracking-tighter uppercase">VERIFYING...</h1>
            <p className="text-[#adaaaa] font-body text-sm">Confirming your identity.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 rounded-full bg-[#cafd00]/10 border border-[#cafd00]/30 flex items-center justify-center mx-auto">
              <span className="material-symbols-filled text-[#cafd00] text-4xl">verified</span>
            </div>
            <h1 className="font-headline text-4xl font-black tracking-tighter uppercase">ACCESS VERIFIED</h1>
            <p className="text-[#adaaaa] font-body text-sm">Your email has been confirmed. You're cleared for full access.</p>
            <Button fullWidth onClick={() => window.location.href = '/'}>ENTER COMMAND CENTER</Button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 rounded-full bg-[#c00018]/10 border border-[#c00018]/30 flex items-center justify-center mx-auto">
              <span className="material-symbols-filled text-[#ff7168] text-4xl">error</span>
            </div>
            <h1 className="font-headline text-4xl font-black tracking-tighter uppercase">VERIFICATION FAILED</h1>
            <p className="text-[#adaaaa] font-body text-sm">{message}</p>
            <Link to="/sign-in">
              <Button fullWidth variant="outline">BACK TO SIGN IN</Button>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
