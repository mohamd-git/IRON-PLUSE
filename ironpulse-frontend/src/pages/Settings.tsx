import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import { useAuthStore } from '../store/authStore'
import api from '../api/client'
import Avatar from '../components/ui/Avatar'
import Toggle from '../components/ui/Toggle'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Input from '../components/ui/Input'

export default function CommandSettings() {
  const { user, logout, setUser } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Mocks based on expected config store
  const [config, setConfig] = useState({
    workoutReminders: true,
    prAlerts: true,
    challengeInvites: false,
    communityActivity: true,
    publicProfile: true,
    leaderboard: true,
    shareWorkouts: false,
    useMetric: true,
  })

  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  // Basic patch wrapper — persists to backend
  const handleToggle = async (key: string, value: boolean) => {
    setConfig(p => ({ ...p, [key]: value }))
    try {
      await api.patch('/users/me', { settings: { [key]: value } })
    } catch {
      setConfig(p => ({ ...p, [key]: !value })) // rollback
    }
  }

  // Display name state for profile edits
  const [displayName, setDisplayName] = useState(user?.display_name || 'OPERATOR')
  const [uname, setUname] = useState(user?.username || '')

  const handleSaveProfile = async () => {
    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await api.patch('/users/me', { display_name: displayName, username: uname })
      setUser(res.data)
      setSaveMsg('Profile updated.')
    } catch (err: any) {
      setSaveMsg(err?.response?.data?.detail || 'Save failed.')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(null), 3000)
    }
  }

  const onDrop = async (files: File[]) => {
    if (!files[0]) return
    const formData = new FormData()
    formData.append('file', files[0])
    try {
      const res = await api.post('/users/me/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setUser({ ...user!, avatar_url: res.data.avatar_url })
    } catch {
      // silently fail — avatar upload is non-critical
    }
  }
  const { getRootProps, getInputProps } = useDropzone({ onDrop, accept: { 'image/*': ['.jpeg', '.jpg', '.png'] } })

  const handleSignOut = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Force exit regardless
    } finally {
      queryClient.clear()
      logout()
      navigate('/sign-in')
    }
  }

  const handleReset = () => {
    if(window.confirm('WARNING: THIS ACTION CANNOT BE UNDONE. ALL TELEMETRY WILL BE WIPED. PROCEED?')) {
      alert('Simulation: Reset deployed.')
    }
  }

  return (
    <div className="space-y-8 pb-10">
      
      <div>
        <h1 className="font-headline text-4xl font-black text-white italic tracking-tighter uppercase leading-none">
          COMMAND SETTINGS
        </h1>
        <p className="text-[#adaaaa] font-body text-xs mt-1">Configure your operator parameters.</p>
      </div>

      {/* Profile Section */}
      <div className="bg-[#1a1a1a] rounded-3xl border border-[#484847]/40 p-6 flex flex-col items-center">
        <div {...getRootProps()} className="relative mb-6 cursor-pointer group">
          <input {...getInputProps()} />
          <Avatar src={user?.avatar_url} name={user?.display_name} size="xl" className="w-24 h-24" />
          <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="material-symbols-filled text-white text-xl">file_upload</span>
            <span className="font-label text-[8px] font-bold tracking-widest text-[#cafd00]">UPDATE</span>
          </div>
        </div>
        
        <div className="w-full space-y-4">
          <Input label="DISPLAY TITLE" value={displayName} onChange={e => setDisplayName(e.target.value)} />
          <Input label="UNIQUE IDENTIFIER (USERNAME)" value={uname} onChange={e => setUname(e.target.value)} />
          {saveMsg && (
            <p className={`text-xs font-label text-center tracking-widest font-bold ${saveMsg.includes('failed') || saveMsg.includes('Failed') ? 'text-[#ff7168]' : 'text-[#cafd00]'}`}>
              {saveMsg}
            </p>
          )}
          <Button fullWidth size="sm" loading={saving} onClick={handleSaveProfile} className="mt-2 text-xs !font-black tracking-widest">LOCK IN PROFILE</Button>
        </div>
      </div>

      {/* Encryption / System Access */}
      <div className="bg-[#1a1a1a] rounded-3xl border border-[#cafd00]/30 shadow-[0_0_15px_rgba(202,253,0,0.05)] p-6 flex flex-col items-center text-center">
        <span className="material-symbols-filled text-[#cafd00] text-4xl mb-2">verified_user</span>
        <h3 className="font-headline font-black text-sm uppercase tracking-widest text-white">256-BIT AES ENCRYPTION ACTIVE</h3>
        <Badge className="!bg-[#cafd00]/10 !text-[#cafd00] border-none !text-[9px] mt-2 font-bold px-2">CONNECTED</Badge>
      </div>

      {/* Integrations Header Row */}
      <div>
        <p className="font-label text-[10px] tracking-widest font-bold text-[#adaaaa] uppercase mb-4 pl-2">BIOMETRIC INTEGRATIONS</p>
        <div className="bg-[#1a1a1a] rounded-3xl border border-[#484847]/40 p-4 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center border border-[#484847]"><span className="font-headline italic font-black text-white text-xs">AH</span></div>
              <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center border border-[#484847]"><span className="font-headline italic font-black text-[#cafd00] text-xs">GAR</span></div>
           </div>
           <Link to="/integrations">
             <Button variant="outline" size="sm" className="!bg-[#262626] border-none text-[#cafd00] gap-1 !px-3 font-black tracking-widest text-[9px] leading-tight flex items-center h-8">
               MANAGE <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
             </Button>
           </Link>
        </div>
      </div>

      {/* Intercom Notifications */}
      <div className="bg-[#1a1a1a] rounded-3xl border border-[#484847]/40 p-2">
        <p className="font-label text-[10px] px-4 pt-4 pb-2 tracking-widest font-bold text-[#adaaaa] uppercase">NOTIFICATION MATRIX</p>
        <div className="divide-y divide-[#484847]/30">
          {[
            { label: 'Workout Reminders', key: 'workoutReminders' },
            { label: 'PR Action Alerts', key: 'prAlerts' },
            { label: 'Challenge Invites', key: 'challengeInvites' },
            { label: 'Community Signals', key: 'communityActivity' }
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between p-4">
              <span className="font-headline font-bold text-sm tracking-wider uppercase text-white">{item.label}</span>
              <Toggle checked={config[item.key as keyof typeof config]} onChange={(v) => handleToggle(item.key, v)} />
            </div>
          ))}
        </div>
      </div>

      {/* Configuration & Privacy */}
      <div className="bg-[#1a1a1a] rounded-3xl border border-[#484847]/40 p-2">
        <p className="font-label text-[10px] px-4 pt-4 pb-2 tracking-widest font-bold text-[#adaaaa] uppercase">SYSTEM PRIVACY</p>
        <div className="divide-y divide-[#484847]/30">
          <div className="flex items-center justify-between p-4">
             <span className="font-headline font-bold text-sm tracking-wider uppercase text-white">Public Profile</span>
             <Toggle checked={config.publicProfile} onChange={(v) => handleToggle('publicProfile', v)} />
          </div>
          <div className="flex items-center justify-between p-4">
             <span className="font-headline font-bold text-sm tracking-wider uppercase text-white">Display on Leaderboards</span>
             <Toggle checked={config.leaderboard} onChange={(v) => handleToggle('leaderboard', v)} />
          </div>
          <div className="flex items-center justify-between p-4">
             <span className="font-headline font-bold text-sm tracking-wider uppercase text-white">Auto-share Operations</span>
             <Toggle checked={config.shareWorkouts} onChange={(v) => handleToggle('shareWorkouts', v)} />
          </div>
        </div>
      </div>

      {/* Core Logic Elements */}
      <div className="bg-[#1a1a1a] rounded-3xl border border-[#484847]/40 p-4 flex items-center justify-between">
         <div>
            <h4 className="font-headline font-bold text-sm tracking-wider uppercase text-white">UNIT ARCHITECTURE</h4>
            <p className="font-label text-[9px] text-[#adaaaa] uppercase tracking-widest font-bold mt-1">METRIC (KG/CM) VS IMPERIAL</p>
         </div>
         <Toggle checked={config.useMetric} onChange={(v) => handleToggle('useMetric', v)} />
      </div>

      <div className="bg-[#1a1a1a] rounded-3xl border border-[red]/30 p-6 flex flex-col items-center text-center">
         <span className="material-symbols-filled text-[red] text-4xl mb-3">warning</span>
         <h4 className="font-headline font-black text-lg text-white uppercase italic tracking-tighter mb-2">TACTICAL OVERRIDE</h4>
         <p className="font-body text-xs text-[#adaaaa] mb-6 max-w-[200px]">Permanently deletes all historical logs and personal records.</p>
         <Button onClick={handleReset} variant="outline" fullWidth className="!border-[red] !text-[red] hover:!bg-[red]/10 font-black tracking-widest">RESET ALL DATA</Button>
      </div>

      {/* Admin Control Panel — only visible to admin */}
      {user?.role === 'admin' && (
        <Link to="/admin">
          <div className="bg-[#1a1a1a] border border-[#c00018]/40 rounded-3xl p-5 flex items-center gap-4 hover:border-[#c00018]/80 transition-colors group">
            <div className="w-12 h-12 rounded-2xl bg-[#c00018]/10 flex items-center justify-center border border-[#c00018]/30 shrink-0">
              <span className="material-symbols-filled text-[#ff7168] text-2xl">admin_panel_settings</span>
            </div>
            <div className="flex-1">
              <h4 className="font-headline font-black text-sm uppercase tracking-wider text-white">Admin Control Panel</h4>
              <p className="font-label text-[9px] tracking-widest text-[#adaaaa] uppercase mt-0.5">Manage users, content &amp; analytics</p>
            </div>
            <span className="material-symbols-outlined text-[#484847] group-hover:text-[#ff7168] transition-colors">arrow_forward</span>
          </div>
        </Link>
      )}

      <Button onClick={handleSignOut} fullWidth icon="logout" variant="ghost" className="!bg-[#262626] border border-[#484847] hover:!bg-[#484847] font-black tracking-widest shadow-lg">
        TERMINATE SESSION
      </Button>
    </div>
  )
}
