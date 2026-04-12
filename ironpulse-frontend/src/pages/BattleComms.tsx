import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/authStore'
import { formatDateTime } from '../utils/formatters'
import api from '../api/client'
import Avatar from '../components/ui/Avatar'

export default function BattleComms() {
  const { userId } = useParams()
  const { user } = useAuthStore()
  const chatEndRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const [inputText, setInputText] = useState('')

  // 1. Sidebar Conversations
  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      try {
        const res = await api.get('/messages/conversations')
        return res.data
      } catch {
        return [
          { user_id: '1', display_name: 'COMMANDER X', avatar: null, last_message: 'Next session at dawn.', unread: 2 },
          { user_id: '2', display_name: 'SARAH_K', avatar: null, last_message: 'Did you hit that PR?', unread: 0 },
        ]
      }
    }
  })

  // 2. Active Chat Log
  const { data: messages } = useQuery({
    queryKey: ['messages', userId],
    enabled: !!userId,
    queryFn: async () => {
      try {
        const res = await api.get(`/messages/${userId}`)
        return res.data
      } catch {
        return [
          { id: 'a', sender_id: userId, content: 'Ready for protocol 04?', created_at: new Date(Date.now() - 3600000).toISOString() },
          { id: 'b', sender_id: user?.id, content: 'Locked in. Are you deploying?', created_at: new Date(Date.now() - 1800000).toISOString() },
          { id: 'c', sender_id: userId, content: 'Yes, just synced my wearable.', created_at: new Date(Date.now() - 60000).toISOString(), 
            workout_embed: { id: 'x', name: 'Tactical Metcon', volume: 14000 } 
          },
        ]
      }
    }
  })

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Effect handles real-time fake sockets or auto-scroll
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || !userId) return

    const tempId = crypto.randomUUID()
    const optimisticMessage = {
      id: tempId,
      sender_id: user?.id,
      content: inputText,
      created_at: new Date().toISOString()
    }

    // Optimistic push
    queryClient.setQueryData(['messages', userId], (old: any) => [...(old || []), optimisticMessage])
    setInputText('')
    scrollToBottom()

    try {
      await api.post(`/messages/${userId}`, { content: optimisticMessage.content })
      // Typically the real websocket or refetch happens here
    } catch {
      // Rollback logic
    }
  }

  const activeConvo = conversations?.find((c: any) => c.user_id === userId)

  return (
    <div className="fixed inset-0 z-50 bg-[#0e0e0e] flex flex-col md:flex-row overflow-hidden border-t-4 border-[#cafd00]">
      {/* Sidebar (Hidden on mobile if targeting a specific chat) */}
      <div className={`${userId ? 'hidden md:flex' : 'flex'} w-full md:w-72 flex-col bg-[#1a1a1a] border-r border-[#484847]/30 h-full`}>
        <div className="p-4 border-b border-[#484847]/30 flex items-center justify-between">
          <h2 className="font-headline text-lg font-black tracking-tighter text-white italic uppercase">BATTLE COMMS</h2>
          <Link to="/" className="md:hidden text-[#adaaaa]"><span className="material-symbols-outlined">close</span></Link>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {conversations?.map((c: any) => (
            <Link key={c.user_id} to={`/comms/${c.user_id}`} className={`flex items-center gap-3 p-4 hover:bg-[#262626] transition-colors border-l-2 ${c.user_id === userId ? 'border-[#cafd00] bg-[#262626]/50' : 'border-transparent'}`}>
              <Avatar src={c.avatar} name={c.display_name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <h4 className="font-headline font-bold text-xs uppercase text-white truncate">{c.display_name}</h4>
                  {c.unread > 0 && <span className="bg-[#cafd00] text-black text-[9px] font-bold px-1.5 rounded">{c.unread}</span>}
                </div>
                <p className="text-[11px] font-body text-[#adaaaa] truncate leading-tight mt-0.5">{c.last_message}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`${!userId ? 'hidden md:flex' : 'flex'} flex-1 flex-col h-full bg-[#0e0e0e] relative`}>
        {userId ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-[#484847]/30 px-6 flex items-center gap-4 bg-[#0e0e0e]/80 backdrop-blur-md z-10">
              <Link to="/comms" className="md:hidden text-[#adaaaa]"><span className="material-symbols-outlined mt-1">arrow_back</span></Link>
              <Avatar src={activeConvo?.avatar} name={activeConvo?.display_name || 'OPERATOR'} size="sm" />
              <div className="flex-1">
                <h3 className="font-headline font-bold text-sm tracking-wider uppercase text-white leading-none">{activeConvo?.display_name || 'OPERATOR'}</h3>
                <span className="font-label text-[10px] uppercase tracking-widest text-[#cafd00] font-bold">Online</span>
              </div>
              <button className="text-[#adaaaa]"><span className="material-symbols-outlined">more_horiz</span></button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 flex flex-col justify-end">
              {/* Force flex end padding spacing naturally in tall chats via container padding/empty divs but keeping it simple */}
              <div className="flex flex-col space-y-4">
                {messages?.map((msg: any) => {
                  const isSent = msg.sender_id === user?.id
                  return (
                    <div key={msg.id} className={`flex flex-col max-w-[80%] ${isSent ? 'self-end items-end' : 'self-start items-start'}`}>
                      <div className={`p-4 rounded-xl ${isSent ? 'bg-[#cafd00] text-black rounded-tr-none' : 'bg-[#1a1a1a] border border-[#484847]/30 text-white rounded-tl-none'}`}>
                        <p className="text-sm font-body leading-relaxed">{msg.content}</p>
                        
                        {/* Workout Embed Card Logic */}
                        {msg.workout_embed && (
                          <div className={`mt-3 p-3 rounded-lg border ${isSent ? 'bg-black/10 border-black/20' : 'bg-[#0e0e0e] border-[#484847]/50'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="material-symbols-filled text-sm text-[#ff7168]">fitness_center</span>
                              <span className="text-xs font-headline font-bold uppercase">{msg.workout_embed.name}</span>
                            </div>
                            <span className={`text-[10px] font-label font-bold uppercase tracking-widest ${isSent ? 'text-black/60' : 'text-[#cafd00]'}`}>{msg.workout_embed.volume} KG VOL</span>
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] font-label tracking-widest text-[#484847] uppercase mt-1 px-1">
                        {formatDateTime(msg.created_at)}
                      </span>
                    </div>
                  )
                })}
                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSend} className="p-4 border-t border-[#484847]/30 bg-[#0e0e0e] flex gap-3 pb-8 md:pb-4">
              <button type="button" className="shrink-0 w-12 h-12 flex items-center justify-center rounded-xl bg-[#1a1a1a] text-[#adaaaa] hover:text-white transition-colors border border-[#484847]/50">
                <span className="material-symbols-outlined text-xl">attach_file</span>
              </button>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Transmit message..."
                className="flex-1 bg-[#1a1a1a] border border-[#484847]/50 rounded-xl px-4 text-white font-body text-sm placeholder-[#484847] outline-none focus:border-[#cafd00] transition-colors"
              />
              <button disabled={!inputText.trim()} type="submit" className="shrink-0 w-12 h-12 flex items-center justify-center rounded-xl bg-[#cafd00] text-black disabled:opacity-50 transition-colors">
                <span className="material-symbols-filled text-xl">send</span>
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#484847]">
            <span className="material-symbols-outlined text-6xl mb-4">forum</span>
            <p className="font-headline text-lg font-black uppercase italic tracking-tighter">SELECT A SECURE CHANNEL</p>
          </div>
        )}
      </div>
    </div>
  )
}
