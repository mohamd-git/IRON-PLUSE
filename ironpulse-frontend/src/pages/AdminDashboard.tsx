import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, Cell } from 'recharts'
import api from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useNotificationStore } from '../store/notificationStore'

import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import Input from '../components/ui/Input'

const TABS = ['ANALYTICS', 'USERS', 'CONTENT']
const FILTERS = ['ALL', 'VIP', 'NEW', 'SUSPENDED']

const MUSCLE_OPTIONS = ['CHEST', 'BACK', 'LEGS', 'SHOULDERS', 'ARMS', 'CORE', 'GLUTES', 'CALVES']
const EQUIPMENT_OPTIONS = ['BARBELL', 'DUMBBELL', 'MACHINE', 'BODYWEIGHT', 'CABLE', 'KETTLEBELL', 'BANDS']
const CATEGORY_OPTIONS = ['STRENGTH', 'CARDIO', 'MOBILITY', 'ENDURANCE']
const DIFFICULTY_OPTIONS = ['RECRUIT', 'INTERMEDIATE', 'OPERATOR', 'ELITE']

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('ANALYTICS')
  const [userQuery, setUserQuery] = useState('')
  const [userFilter, setUserFilter] = useState('ALL')
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { unreadCount } = useNotificationStore()

  // ── Exercise creation state ──────────────────────────
  const [exForm, setExForm] = useState({
    name: '',
    category: 'STRENGTH',
    muscle_group: 'CHEST',
    equipment: 'BARBELL',
    difficulty: 'INTERMEDIATE',
    image_url: '',
    description: '',
    instructions: [''],
  })
  const [exSaving, setExSaving] = useState(false)
  const [exMsg, setExMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const { data: stats } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      try {
        const res = await api.get('/admin/analytics')
        const d = res.data
        return {
          totalUsers: { value: d.total_users, delta: '' },
          activeUsers: { value: d.active_this_week, delta: '7D' },
          vipMembers: { value: d.vip_count, delta: '' },
          totalSessions: { value: d.total_sessions, delta: '' },
          mrr: d.mrr_myr,
        }
      } catch {
        return {
          totalUsers: { value: 0, delta: '' },
          activeUsers: { value: 0, delta: '7D' },
          vipMembers: { value: 0, delta: '' },
          totalSessions: { value: 0, delta: '' },
          mrr: 0,
        }
      }
    }
  })

  const { data: users, refetch: refetchUsers } = useQuery({
    queryKey: ['adminUsers', userFilter, userQuery],
    queryFn: async () => {
      try {
        const params: Record<string, string> = {}
        if (userFilter === 'VIP') params.role = 'vip'
        if (userFilter === 'SUSPENDED') params.is_active = 'false'
        if (userQuery) params.search = userQuery
        const res = await api.get('/admin/users', { params })
        return res.data
      } catch {
        return []
      }
    }
  })

  const { data: revenue } = useQuery({
    queryKey: ['adminRevenue'],
    queryFn: async () => {
      return [
        { month: 'Jan', rev: 14000 },
        { month: 'Feb', rev: 18000 },
        { month: 'Mar', rev: 16000 },
        { month: 'Apr', rev: 25000 },
        { month: 'May', rev: 32000 },
        { month: 'Jun', rev: 41000 },
        { month: 'Jul', rev: 38000 },
        { month: 'Aug', rev: 45000 },
        { month: 'Sep', rev: 52000 },
        { month: 'Oct', rev: 61000 },
        { month: 'Nov', rev: 72000 },
        { month: 'Dec', rev: 89000 }
      ]
    }
  })

  const { data: feed } = useQuery({
    queryKey: ['adminFeed'],
    queryFn: async () => {
       return [
         { id: '1', log: 'User S_JONES upgraded to VIP ELITE.', time: '2m ago' },
         { id: '2', log: 'Mass operation warning: DB CPU spike > 80%.', time: '14m ago', error: true },
         { id: '3', log: 'User TITAN_5 banned for ToS violation.', time: '1hr ago' },
         { id: '4', log: 'Daily chron-job successful (Data rotation)', time: '2hrs ago' },
         { id: '5', log: 'Garmin Webhooks re-authenticated.', time: '4hrs ago' }
       ]
    }
  })

  const StatTile = ({ title, value, delta }: any) => (
    <div className="bg-[#1a1a1a] rounded-2xl border border-[#484847]/50 p-6 flex flex-col justify-between h-36 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-[#cafd00]/5 rounded-full blur-2xl pointer-events-none" />
      <span className="font-label text-xs uppercase text-[#adaaaa] tracking-widest font-bold">{title}</span>
      <div className="flex justify-between items-end">
         <span className="font-headline font-black text-4xl tracking-tighter text-white drop-shadow-sm">{value}</span>
         <span className="font-label text-[10px] tracking-widest text-[#cafd00] font-bold bg-[#cafd00]/10 px-2 py-0.5 rounded">{delta}</span>
      </div>
    </div>
  )

  const handleSuspend = async (id: string, currentlyActive: boolean) => {
    await api.patch(`/admin/users/${id}`, { is_active: !currentlyActive })
    refetchUsers()
  }

  const handleSetRole = async (id: string, role: string) => {
    await api.patch(`/admin/users/${id}`, { role })
    refetchUsers()
  }

  // Map display labels → backend enum values
  const DIFFICULTY_MAP: Record<string, string> = {
    RECRUIT: 'beginner',
    INTERMEDIATE: 'intermediate',
    OPERATOR: 'advanced',
    ELITE: 'advanced',
  }

  const handleSubmitExercise = async () => {
    if (!exForm.name.trim()) return
    setExSaving(true)
    setExMsg(null)
    try {
      await api.post('/exercises', {
        name: exForm.name,
        category: exForm.category.toLowerCase(),
        muscle_groups: [exForm.muscle_group.toLowerCase()],
        equipment: [exForm.equipment.toLowerCase()],
        difficulty: DIFFICULTY_MAP[exForm.difficulty] ?? 'intermediate',
        image_url: exForm.image_url || null,
        description: exForm.description || null,
        form_steps: exForm.instructions.filter(s => s.trim()),
      })
      setExMsg({ text: `"${exForm.name}" added to library.`, ok: true })
      setExForm({ name: '', category: 'STRENGTH', muscle_group: 'CHEST', equipment: 'BARBELL', difficulty: 'INTERMEDIATE', image_url: '', description: '', instructions: [''] })
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      const msg = Array.isArray(detail)
        ? detail.map((d: any) => `${d.loc?.join('.')}: ${d.msg}`).join(' | ')
        : detail || err?.message || 'Failed to save exercise.'
      setExMsg({ text: msg, ok: false })
    } finally {
      setExSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white flex flex-col">
      {/* Admin Desktop Header */}
      <div className="h-16 shrink-0 bg-[#0e0e0e] border-b border-[#c00018]/50 flex items-center justify-between px-6 z-10 sticky top-0">
        <div className="flex items-center gap-4">
          <Link to="/" className="font-headline font-black text-xl italic tracking-tighter uppercase text-white hover:text-[#cafd00] transition-colors">IRON PULSE</Link>
          <Badge className="bg-[#c00018]/20 text-[#ff7168] border-[#c00018] tracking-widest font-bold ml-2">ADMIN CONTROL</Badge>
        </div>
        
        {/* Top bar internal desktop routing */}
        <div className="hidden md:flex gap-6 items-center">
           {TABS.map(t => (
              <button 
                key={t} 
                onClick={() => setActiveTab(t)}
                className={`font-headline text-xs font-bold tracking-widest uppercase transition-colors relative h-16 ${activeTab === t ? 'text-white' : 'text-[#adaaaa] hover:text-white'}`}
              >
                {t}
                {activeTab === t && <motion.div layoutId="admin-active" className="absolute bottom-[-1px] left-0 w-full h-[3px] bg-[#c00018]" />}
              </button>
           ))}
        </div>

        <div className="flex items-center gap-4">
          <Link to="/signals" className="relative p-1.5 rounded-full hover:bg-[#1a1a1a] transition-colors">
            <span className="material-symbols-outlined text-[#adaaaa] hover:text-white transition-colors">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#ff7168] text-[9px] font-bold rounded-full flex items-center justify-center text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
          <Link to="/profile" className="hover:ring-2 hover:ring-[#c00018]/40 rounded-full transition-all">
            <Avatar size="sm" src={user?.avatar_url} name={user?.display_name || user?.username} className="border border-[#c00018]" />
          </Link>
        </div>
      </div>

      <div className="flex-1 w-full max-w-7xl mx-auto p-6 flex flex-col gap-8">
        
        {/* Universal Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatTile title="Total Users" value={(stats?.totalUsers?.value ?? 0).toLocaleString()} delta={stats?.totalUsers?.delta || ''} />
          <StatTile title="Active (7D)" value={(stats?.activeUsers?.value ?? 0).toLocaleString()} delta="7D" />
          <StatTile title="VIP Members" value={(stats?.vipMembers?.value ?? 0).toLocaleString()} delta={stats?.vipMembers?.delta || ''} />
          <StatTile title="Total Sessions" value={(stats?.totalSessions?.value ?? 0).toLocaleString()} delta={stats?.totalSessions?.delta || ''} />
        </div>

        {activeTab === 'USERS' && (
          <div className="flex-1 flex flex-col bg-[#1a1a1a] rounded-3xl border border-[#484847]/40 p-6 overflow-hidden">
             <div className="flex justify-between items-center mb-6">
                <div className="flex gap-2">
                   {FILTERS.map(f => (
                     <button key={f} onClick={() => setUserFilter(f)} className={`px-4 py-1.5 rounded-full font-headline font-bold text-[10px] tracking-widest uppercase transition-colors border ${userFilter === f ? 'bg-white text-black border-white' : 'bg-[#262626] text-[#adaaaa] border-[#484847]/50'}`}>
                        {f}
                     </button>
                   ))}
                </div>
                <div className="relative w-64">
                   <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#adaaaa]">search</span>
                   <input type="text" value={userQuery} onChange={(e) => setUserQuery(e.target.value)} placeholder="Search username or email..." className="w-full bg-[#0e0e0e] border border-[#484847] rounded-full pl-10 pr-4 py-2 text-white font-body text-xs outline-none focus:border-[#c00018] transition-colors" />
                </div>
             </div>

             <div className="flex-1 overflow-x-auto relative">
                <table className="w-full text-left font-body text-sm border-collapse min-w-[800px]">
                   <thead className="bg-[#262626] font-headline text-[10px] font-bold text-[#adaaaa] tracking-widest uppercase">
                     <tr>
                        <th className="px-4 py-3 rounded-tl-lg">User</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Joined</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3 rounded-tr-lg">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-[#484847]/30">
                     {(users || []).map((u: any) => (
                       <tr key={u.id} className={`hover:bg-[#262626]/40 transition-colors ${!u.is_active ? 'opacity-50' : ''}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar size="sm" src={u.avatar_url} name={u.display_name || u.username} />
                              <div>
                                <p className="font-headline font-black uppercase text-white tracking-wider text-xs">{u.username}</p>
                                <p className="font-label text-[9px] text-[#adaaaa] tracking-widest">{u.display_name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[#adaaaa] font-label text-xs">{u.email}</td>
                          <td className="px-4 py-3 text-[#adaaaa] font-label text-xs">{u.created_at?.slice(0, 10)}</td>
                          <td className="px-4 py-3">
                             {u.role === 'admin' && <Badge className="bg-[#c00018]/10 text-[#ff7168] border-none font-black text-[9px] px-2">ADMIN</Badge>}
                             {u.role === 'vip' && <Badge className="bg-[#d4af37]/10 text-[#d4af37] border-none font-black text-[9px] px-2">VIP</Badge>}
                             {u.role === 'user' && <Badge className="bg-[#262626] text-[#adaaaa] border-none font-bold text-[9px]">FREE</Badge>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {u.role !== 'vip' && u.role !== 'admin' && (
                                <button onClick={() => handleSetRole(u.id, 'vip')} title="Grant VIP" className="p-1.5 rounded bg-[#0e0e0e] text-[#adaaaa] hover:text-[#d4af37] border border-[#484847] hover:border-[#d4af37] transition-colors">
                                  <span className="material-symbols-filled text-[14px] block">workspace_premium</span>
                                </button>
                              )}
                              {u.role === 'vip' && (
                                <button onClick={() => handleSetRole(u.id, 'user')} title="Revoke VIP" className="p-1.5 rounded bg-[#0e0e0e] text-[#adaaaa] hover:text-white border border-[#484847] transition-colors">
                                  <span className="material-symbols-outlined text-[14px] block">remove_moderator</span>
                                </button>
                              )}
                              {u.role !== 'admin' && (
                                <button onClick={() => handleSuspend(u.id, u.is_active)} title={u.is_active ? 'Suspend' : 'Reactivate'} className={`p-1.5 rounded bg-[#0e0e0e] border border-[#484847] transition-colors ${u.is_active ? 'text-[#adaaaa] hover:text-[#ff7168] hover:border-[#ff7168]' : 'text-[#cafd00] hover:border-[#cafd00]'}`}>
                                  <span className="material-symbols-outlined text-[14px] block">{u.is_active ? 'block' : 'check_circle'}</span>
                                </button>
                              )}
                            </div>
                          </td>
                       </tr>
                     ))}
                     {(users || []).length === 0 && (
                       <tr><td colSpan={5} className="px-4 py-8 text-center text-[#484847] font-label text-xs tracking-widest uppercase">No users found</td></tr>
                     )}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {activeTab === 'CONTENT' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Add Exercise Form */}
            <div className="bg-[#1a1a1a] rounded-3xl border border-[#484847]/40 p-6 flex flex-col gap-5">
              <div>
                <h3 className="font-headline font-black text-lg italic uppercase tracking-tighter text-white">Add Exercise</h3>
                <p className="font-label text-[9px] tracking-widest text-[#adaaaa] uppercase mt-1">Published instantly to the exercise library</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="font-label text-[10px] tracking-widest text-[#adaaaa] uppercase font-bold mb-1.5 block">Exercise Name *</label>
                  <input
                    value={exForm.name}
                    onChange={e => setExForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Bulgarian Split Squat"
                    className="w-full bg-[#0e0e0e] border border-[#484847] rounded-xl px-4 py-3 text-white font-body text-sm outline-none focus:border-[#cafd00] transition-colors placeholder-[#484847]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-label text-[10px] tracking-widest text-[#adaaaa] uppercase font-bold mb-1.5 block">Category</label>
                    <select value={exForm.category} onChange={e => setExForm(f => ({ ...f, category: e.target.value }))} className="w-full bg-[#0e0e0e] border border-[#484847] rounded-xl px-3 py-3 text-white font-body text-sm outline-none focus:border-[#cafd00] transition-colors">
                      {CATEGORY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="font-label text-[10px] tracking-widest text-[#adaaaa] uppercase font-bold mb-1.5 block">Difficulty</label>
                    <select value={exForm.difficulty} onChange={e => setExForm(f => ({ ...f, difficulty: e.target.value }))} className="w-full bg-[#0e0e0e] border border-[#484847] rounded-xl px-3 py-3 text-white font-body text-sm outline-none focus:border-[#cafd00] transition-colors">
                      {DIFFICULTY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-label text-[10px] tracking-widest text-[#adaaaa] uppercase font-bold mb-1.5 block">Muscle Group</label>
                    <select value={exForm.muscle_group} onChange={e => setExForm(f => ({ ...f, muscle_group: e.target.value }))} className="w-full bg-[#0e0e0e] border border-[#484847] rounded-xl px-3 py-3 text-white font-body text-sm outline-none focus:border-[#cafd00] transition-colors">
                      {MUSCLE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="font-label text-[10px] tracking-widest text-[#adaaaa] uppercase font-bold mb-1.5 block">Equipment</label>
                    <select value={exForm.equipment} onChange={e => setExForm(f => ({ ...f, equipment: e.target.value }))} className="w-full bg-[#0e0e0e] border border-[#484847] rounded-xl px-3 py-3 text-white font-body text-sm outline-none focus:border-[#cafd00] transition-colors">
                      {EQUIPMENT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-label text-[10px] tracking-widest text-[#adaaaa] uppercase font-bold mb-1.5 block">Image URL</label>
                  <input
                    value={exForm.image_url}
                    onChange={e => setExForm(f => ({ ...f, image_url: e.target.value }))}
                    placeholder="https://... (optional)"
                    className="w-full bg-[#0e0e0e] border border-[#484847] rounded-xl px-4 py-3 text-white font-body text-sm outline-none focus:border-[#cafd00] transition-colors placeholder-[#484847]"
                  />
                </div>

                <div>
                  <label className="font-label text-[10px] tracking-widest text-[#adaaaa] uppercase font-bold mb-1.5 block">Description</label>
                  <textarea
                    value={exForm.description}
                    onChange={e => setExForm(f => ({ ...f, description: e.target.value }))}
                    rows={3}
                    placeholder="Brief overview of the movement..."
                    className="w-full bg-[#0e0e0e] border border-[#484847] rounded-xl px-4 py-3 text-white font-body text-sm outline-none focus:border-[#cafd00] transition-colors placeholder-[#484847] resize-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-label text-[10px] tracking-widest text-[#adaaaa] uppercase font-bold">Instructions (steps)</label>
                    <button onClick={() => setExForm(f => ({ ...f, instructions: [...f.instructions, ''] }))} className="text-[#cafd00] font-label text-[9px] uppercase tracking-widest hover:underline">+ Add Step</button>
                  </div>
                  <div className="space-y-2">
                    {exForm.instructions.map((step, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <span className="font-headline font-black text-[#484847] text-xs w-5 shrink-0">{i + 1}.</span>
                        <input
                          value={step}
                          onChange={e => {
                            const steps = [...exForm.instructions]
                            steps[i] = e.target.value
                            setExForm(f => ({ ...f, instructions: steps }))
                          }}
                          placeholder={`Step ${i + 1}...`}
                          className="flex-1 bg-[#0e0e0e] border border-[#484847] rounded-lg px-3 py-2 text-white font-body text-xs outline-none focus:border-[#cafd00] transition-colors placeholder-[#484847]"
                        />
                        {exForm.instructions.length > 1 && (
                          <button onClick={() => setExForm(f => ({ ...f, instructions: f.instructions.filter((_, j) => j !== i) }))} className="text-[#484847] hover:text-[#ff7168] transition-colors">
                            <span className="material-symbols-outlined text-base">close</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {exMsg && (
                <p className={`font-label text-[10px] tracking-widest uppercase font-bold ${exMsg.ok ? 'text-[#cafd00]' : 'text-[#ff7168]'}`}>
                  {exMsg.ok ? '✓' : '✗'} {exMsg.text}
                </p>
              )}

              <button
                onClick={handleSubmitExercise}
                disabled={exSaving || !exForm.name.trim()}
                className="w-full bg-[#cafd00] text-black font-headline font-black text-sm tracking-widest uppercase py-4 rounded-2xl hover:bg-[#b8e800] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {exSaving ? 'SAVING...' : 'PUBLISH EXERCISE'}
              </button>
            </div>

            {/* Quick action cards */}
            <div className="flex flex-col gap-4">
              <div className="bg-[#1a1a1a] rounded-3xl border border-[#484847]/40 p-6">
                <h3 className="font-headline font-black text-base italic uppercase tracking-tighter text-white mb-4">Content Stats</h3>
                {[
                  { label: 'Exercises in Library', icon: 'fitness_center', path: '/exercises' },
                  { label: 'Workout Protocols', icon: 'assignment', path: '/training' },
                  { label: 'Challenges', icon: 'emoji_events', path: '/challenges' },
                ].map(item => (
                  <Link key={item.path} to={item.path} className="flex items-center gap-4 py-3 border-b border-[#484847]/30 last:border-0 hover:opacity-70 transition-opacity">
                    <span className="material-symbols-outlined text-[#cafd00]">{item.icon}</span>
                    <span className="font-headline font-bold text-sm text-white uppercase tracking-wide flex-1">{item.label}</span>
                    <span className="material-symbols-outlined text-[#484847] text-base">arrow_forward</span>
                  </Link>
                ))}
              </div>

              <div className="bg-[#1a1a1a] rounded-3xl border border-[#484847]/40 p-6">
                <h3 className="font-headline font-black text-base italic uppercase tracking-tighter text-white mb-1">Grant VIP to User</h3>
                <p className="font-label text-[9px] tracking-widest text-[#adaaaa] uppercase mb-4">Or use the Users tab to manage roles</p>
                <p className="font-body text-xs text-[#adaaaa]">Go to the <span className="text-white font-bold">USERS</span> tab → find the user → tap the gold crown icon to grant VIP access instantly. To revoke, tap the shield icon.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ANALYTICS' && (
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Massive Center Chart */}
              <div className="md:col-span-2 bg-[#1a1a1a] rounded-3xl border border-[#484847]/40 p-6 flex flex-col gap-6 relative overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] w-[300px] h-[300px] bg-[#cafd00]/5 rounded-full blur-[80px] pointer-events-none" />
                <div className="flex justify-between items-start">
                   <div>
                     <h3 className="font-headline font-black text-xl italic uppercase tracking-tighter text-white shadow-sm">REVENUE ARCHITECTURE</h3>
                     <p className="font-label text-[10px] tracking-widest text-[#adaaaa] font-bold uppercase mt-1">YTD: RM {revenue?.reduce((acc: number, curr: any) => acc + curr.rev, 0).toLocaleString()}</p>
                   </div>
                   <div className="text-right">
                     <p className="font-headline font-black text-4xl tracking-tighter text-white leading-none">RM 89k</p>
                     <p className="font-label text-[10px] tracking-widest text-[#cafd00] font-bold uppercase mt-1">Current MRR (+23%)</p>
                   </div>
                </div>
                
                <div className="h-64 w-[calc(100%+2rem)] -ml-4 z-10 w-full pr-4 pb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenue || []} margin={{ top: 10, right: 0, bottom: 0, left: 10 }}>
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#adaaaa', fontSize: 10,  fontFamily: 'Inter' }} dy={10} />
                      <Tooltip 
                         cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                         contentStyle={{ backgroundColor: '#0e0e0e', border: '1px solid #484847', borderRadius: '12px', fontSize: '12px' }}
                         itemStyle={{ color: '#cafd00', fontWeight: 'bold' }}
                         labelStyle={{ color: '#adaaaa' }}
                      />
                      <Bar dataKey="rev" radius={[4, 4, 0, 0]}>
                        {revenue?.map((entry: any, index: number) => (
                           <Cell key={index} fill={index === revenue.length - 1 ? '#cafd00' : '#484847'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Feed Matrix */}
              <div className="md:col-span-1 bg-[#1a1a1a] rounded-3xl border border-[#484847]/40 p-6 flex flex-col gap-4">
                 <div className="flex items-center gap-2 mb-2 pb-4 border-b border-[#484847]/40">
                   <div className="relative flex h-2 w-2">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#cafd00] opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-2 w-2 bg-[#cafd00]"></span>
                   </div>
                   <h3 className="font-headline font-black text-xs italic uppercase tracking-wider text-white">System Logs</h3>
                 </div>
                 
                 <div className="flex flex-col gap-4 overflow-y-auto">
                    {feed?.map((item: any) => (
                      <div key={item.id} className="flex gap-3">
                         <span className={`material-symbols-outlined text-sm mt-0.5 ${item.error ? 'text-[#ff7168]' : 'text-[#adaaaa]'}`}>
                           {item.error ? 'warning' : 'terminal'}
                         </span>
                         <div>
                            <p className="font-body text-xs text-white leading-tight">{item.log}</p>
                            <p className="font-label text-[9px] uppercase tracking-widest text-[#484847] font-bold mt-1">{item.time}</p>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>

           </div>
        )}
      </div>
    </div>
  )
}
