import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import RecoveryRing from '../components/charts/RecoveryRing'
import Badge from '../components/ui/Badge'

// Base URL for direct fetch (SSE needs native fetch, not axios)
const API_BASE = import.meta.env.VITE_API_URL || '/api/v1'

export default function VIPDashboard() {
  const { user, accessToken } = useAuthStore()

  // Chat state
  const [messages, setMessages] = useState<{ role: 'coach' | 'user'; text: string }[]>([
    { role: 'coach', text: 'Elite access confirmed. Send me your query — training, nutrition, recovery, anything.' }
  ])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Physique analysis state
  const [analyzing, setAnalyzing] = useState(false)
  const [physiqueResult, setPhysiqueResult] = useState<any>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Real SSE streaming to /ai/coach ─────────────────
  const handleSend = async (e?: React.FormEvent, overrideMsg?: string) => {
    e?.preventDefault()
    const msg = overrideMsg ?? input.trim()
    if (!msg || isStreaming) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: msg }])
    setIsStreaming(true)

    // Build conversation history (last 10 exchanges)
    const history = messages.slice(-10).map(m => ({
      role: m.role === 'coach' ? 'assistant' : 'user',
      content: m.text,
    }))

    // Add placeholder for streaming
    setMessages(prev => [...prev, { role: 'coach', text: '' }])

    abortRef.current = new AbortController()

    try {
      const res = await fetch(`${API_BASE}/ai/coach`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ message: msg, conversation_history: history }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        // Parse SSE lines: "data: {...}\n\n"
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') break
          try {
            const { content } = JSON.parse(payload)
            accumulated += content
            setMessages(prev => {
              const updated = [...prev]
              updated[updated.length - 1] = { role: 'coach', text: accumulated }
              return updated
            })
          } catch { /* skip malformed */ }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'coach', text: 'Connection interrupted. Try again, soldier. 💪' }
          return updated
        })
      }
    } finally {
      setIsStreaming(false)
    }
  }

  // ── Image → Base64 → /ai/analyze-physique ───────────
  const onDrop = async (files: File[]) => {
    if (!files[0]) return
    setAnalyzing(true)
    setPhysiqueResult(null)

    // Convert to base64
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        // Strip the "data:image/jpeg;base64," prefix
        const result = (reader.result as string).split(',')[1]
        resolve(result)
      }
      reader.onerror = reject
      reader.readAsDataURL(files[0])
    })

    try {
      const res = await fetch(`${API_BASE}/ai/analyze-physique`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ photo_base64: base64 }),
      })
      const data = await res.json()
      const analysis = data.analysis
      setPhysiqueResult(analysis)

      // Summarise into chat
      const summary = `Physique scan complete. ${analysis.overall_assessment} Est. body fat: ${analysis.estimated_body_fat_range}. Strengths: ${analysis.strengths?.slice(0,2).join(', ')}.`
      setMessages(prev => [...prev, { role: 'coach', text: summary }])
    } catch {
      setMessages(prev => [...prev, { role: 'coach', text: 'Physique capture received. Processing interrupted — retry shortly.' }])
    } finally {
      setAnalyzing(false)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png'] },
    maxFiles: 1,
    disabled: analyzing,
  })

  return (
    <div className="flex flex-col gap-6 pb-10">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d4af37] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#d4af37]" />
            </div>
            <span className="font-label text-[9px] font-bold tracking-widest text-[#d4af37] uppercase">ELITE ACCESS ACTIVE</span>
          </div>
          <h1 className="font-headline text-4xl font-black italic uppercase tracking-tighter text-white leading-none">VIP COMMAND</h1>
        </div>
        <Badge className="!bg-gradient-to-r !from-[#d4af37] !to-[#b38b22] !text-black !border-none font-black text-[9px] tracking-widest px-3 py-1.5">
          {user?.role === 'admin' ? 'OWNER' : 'VIP ELITE'}
        </Badge>
      </div>

      {/* Elite Rank + Recovery — side by side */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#1a1a1a] rounded-3xl border border-[#484847]/40 p-4 flex flex-col justify-between">
          <p className="font-label text-[9px] tracking-widest text-[#adaaaa] uppercase font-bold">Elite Rank</p>
          <div>
            <h3 className="font-headline font-black text-2xl uppercase tracking-tighter text-white leading-none">TITAN V</h3>
            <p className="font-label text-[9px] text-[#adaaaa] uppercase tracking-wider mt-0.5">TOP 1%</p>
            <div className="h-1.5 w-full bg-[#262626] rounded-full overflow-hidden mt-3">
              <div className="h-full bg-gradient-to-r from-[#d4af37] to-[#ffeaa7] w-3/4 rounded-full" />
            </div>
            <p className="font-label text-[8px] text-[#484847] uppercase tracking-wider mt-1.5">1,400 XP TO IMMORTAL</p>
          </div>
        </div>
        <div className="bg-[#1a1a1a] rounded-3xl border border-[#484847]/40 p-4 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[#d4af37]/5 blur-2xl pointer-events-none" />
          <RecoveryRing percentage={94} size={90} label="RECOVERY" />
        </div>
      </div>

      {/* AI Coach — real Groq streaming */}
      <div className="bg-[#1a1a1a] rounded-3xl border border-[#d4af37]/30 overflow-hidden">
        <div className="px-4 py-3 border-b border-[#484847]/40 flex items-center gap-2">
          <span className="material-symbols-filled text-[#d4af37] text-lg">psychology</span>
          <h2 className="font-headline font-black text-sm uppercase tracking-widest text-white">Cerebro AI Coach</h2>
          <div className="ml-auto flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${isStreaming ? 'bg-[#d4af37] animate-pulse' : 'bg-[#cafd00]'}`} />
            <span className="font-label text-[8px] text-[#adaaaa] uppercase tracking-widest">
              {isStreaming ? 'THINKING...' : 'LIVE'}
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="px-4 py-4 flex flex-col gap-3 max-h-[260px] overflow-y-auto custom-scrollbar">
          {messages.map((msg, i) => (
            <div key={i} className={`flex flex-col max-w-[88%] ${msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'}`}>
              <div className={`px-4 py-2.5 rounded-2xl text-sm font-body leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#cafd00] text-black rounded-tr-none'
                  : 'bg-[#262626] text-[#adaaaa] rounded-tl-none border-l-2 border-[#d4af37]'
              }`}>
                {msg.text}
                {isStreaming && i === messages.length - 1 && msg.role === 'coach' && (
                  <span className="inline-block w-1 h-3.5 ml-1 bg-[#d4af37] animate-pulse align-middle" />
                )}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 pb-4 border-t border-[#484847]/30 pt-3">
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask your AI coach anything..."
              disabled={isStreaming}
              className="flex-1 bg-[#0e0e0e] border border-[#484847]/50 rounded-xl px-4 py-3 text-white font-body text-sm placeholder-[#484847] outline-none focus:border-[#d4af37] disabled:opacity-50 transition-colors"
            />
            {isStreaming ? (
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                className="w-12 h-12 flex items-center justify-center shrink-0 rounded-xl bg-[#c00018] text-white transition-all"
              >
                <span className="material-symbols-filled">stop</span>
              </button>
            ) : (
              <button
                disabled={!input.trim()}
                type="submit"
                className="w-12 h-12 flex items-center justify-center shrink-0 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b38b22] text-black disabled:opacity-40 transition-all"
              >
                <span className="material-symbols-filled">send</span>
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Quick Prompts */}
      <div>
        <p className="font-label text-[9px] tracking-widest text-[#adaaaa] uppercase font-bold mb-3">QUICK QUERIES</p>
        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {[
            'Build me a push day',
            'Fix my plateau',
            'Best pre-workout meal',
            'Improve my recovery',
            'Rate my split',
          ].map(q => (
            <button
              key={q}
              onClick={() => handleSend(undefined, q)}
              disabled={isStreaming}
              className="shrink-0 bg-[#1a1a1a] border border-[#d4af37]/20 text-[#d4af37] font-label text-[9px] uppercase tracking-widest px-3 py-2 rounded-full hover:border-[#d4af37]/60 disabled:opacity-40 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Physique Analysis Upload */}
      <div
        {...getRootProps()}
        className={`bg-[#1a1a1a] rounded-3xl border-2 border-dashed transition-colors p-6 cursor-pointer ${
          isDragActive ? 'border-[#d4af37]' : 'border-[#484847] hover:border-[#d4af37]/60'
        } ${analyzing ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#d4af37] text-2xl">
              {analyzing ? 'hourglass_top' : 'body_system'}
            </span>
          </div>
          <div>
            <h4 className="font-headline font-black text-sm uppercase tracking-wide text-white">Physique Analysis</h4>
            <p className="font-body text-xs text-[#adaaaa] mt-1">Upload a photo — AI estimates body fat &amp; symmetry</p>
          </div>
          {analyzing && <p className="font-label text-[9px] uppercase tracking-widest text-[#d4af37] animate-pulse font-bold">ANALYZING BIOMETRICS...</p>}
          {!analyzing && isDragActive && <p className="font-label text-[9px] uppercase tracking-widest text-[#cafd00] font-bold">DROP TO ANALYZE</p>}
          {!analyzing && !isDragActive && <span className="bg-[#262626] text-[#adaaaa] font-label text-[9px] uppercase tracking-widest px-4 py-2 rounded-full">TAP TO UPLOAD</span>}
        </div>
      </div>

      {/* Physique result card */}
      {physiqueResult && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1a1a1a] rounded-3xl border border-[#d4af37]/30 p-5 space-y-4"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-filled text-[#d4af37]">analytics</span>
            <h3 className="font-headline font-black text-sm uppercase tracking-wide text-white">Biometric Report</h3>
            <span className="ml-auto font-headline font-black text-sm text-[#d4af37]">{physiqueResult.estimated_body_fat_range}</span>
          </div>
          <p className="font-body text-xs text-[#adaaaa] leading-relaxed">{physiqueResult.overall_assessment}</p>
          {physiqueResult.strengths?.length > 0 && (
            <div>
              <p className="font-label text-[9px] uppercase tracking-widest text-[#cafd00] font-bold mb-2">STRENGTHS</p>
              <div className="flex flex-wrap gap-2">
                {physiqueResult.strengths.map((s: string) => (
                  <span key={s} className="bg-[#cafd00]/10 text-[#cafd00] font-label text-[9px] uppercase tracking-widest px-2 py-1 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}
          {physiqueResult.areas_for_improvement?.length > 0 && (
            <div>
              <p className="font-label text-[9px] uppercase tracking-widest text-[#ff7168] font-bold mb-2">IMPROVE</p>
              <div className="flex flex-wrap gap-2">
                {physiqueResult.areas_for_improvement.map((s: string) => (
                  <span key={s} className="bg-[#ff7168]/10 text-[#ff7168] font-label text-[9px] uppercase tracking-widest px-2 py-1 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* VIP Stats Row */}
      <div>
        <p className="font-label text-[9px] tracking-widest text-[#adaaaa] uppercase font-bold mb-3">YOUR ELITE STATS</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Sessions', value: user?.current_streak != null ? String(user.current_streak) : '—', icon: 'fitness_center' },
            { label: 'Streak', value: `${user?.current_streak ?? 0} 🔥`, icon: 'local_fire_department' },
            { label: 'Status', value: user?.role?.toUpperCase() ?? '—', icon: 'verified' },
          ].map(stat => (
            <div key={stat.label} className="bg-[#1a1a1a] rounded-2xl border border-[#484847]/40 p-4 flex flex-col items-center gap-1">
              <span className="material-symbols-outlined text-[#d4af37] text-lg">{stat.icon}</span>
              <span className="font-headline font-black text-base text-white leading-none">{stat.value}</span>
              <span className="font-label text-[8px] text-[#adaaaa] uppercase tracking-widest">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Exclusive Supply Drop */}
      <div className="bg-gradient-to-r from-[#1a1a1a] to-[#262626] rounded-3xl border border-[#d4af37]/30 p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center shrink-0">
          <span className="material-symbols-filled text-[#d4af37] text-2xl">inventory_2</span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-headline font-black text-sm uppercase text-white truncate">Armament Supply Drop</h4>
          <p className="font-label text-[9px] text-[#adaaaa] uppercase tracking-widest mt-0.5">New 24hr Elite Program unlocked</p>
        </div>
        <Link to="/training" className="shrink-0 bg-[#d4af37] text-black font-headline font-black text-[9px] uppercase tracking-widest px-4 py-2.5 rounded-full hover:brightness-110 transition-all">
          ACCESS
        </Link>
      </div>

      {/* Go to Lounge */}
      <Link to="/vip-lounge">
        <div className="bg-[#1a1a1a] rounded-3xl border border-[#d4af37]/20 p-5 flex items-center gap-4 hover:border-[#d4af37]/50 transition-colors group">
          <div className="w-12 h-12 rounded-2xl bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center shrink-0">
            <span className="material-symbols-filled text-[#d4af37] text-2xl">forum</span>
          </div>
          <div className="flex-1">
            <h4 className="font-headline font-black text-sm uppercase text-white">Operator Lounge</h4>
            <p className="font-label text-[9px] text-[#adaaaa] uppercase tracking-widest mt-0.5">Chat · Programs · Challenges</p>
          </div>
          <span className="material-symbols-outlined text-[#484847] group-hover:text-[#d4af37] transition-colors">arrow_forward</span>
        </div>
      </Link>

    </div>
  )
}
