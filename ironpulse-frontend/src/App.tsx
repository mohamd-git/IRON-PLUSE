import React, { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useAuthStore } from './store/authStore'
import { useNotificationStore } from './store/notificationStore'
import api from './api/client'

// ── Layout ───────────────────────────────────────────
import PageWrapper from './components/layout/PageWrapper'
import GlobalProgressBar from './components/ui/GlobalProgressBar'
import ToastProvider from './components/ui/ToastProvider'

// ── Public Auth Pages ────────────────────────────────
import SignIn from './pages/Login'
import SignUp from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import VerifyEmail from './pages/VerifyEmail'

// ── Protected Pages ──────────────────────────────────
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import TrainingGuides from './pages/Templates'
import ExerciseDetail from './pages/ExerciseDetail'
import ExerciseLibrary from './pages/Exercises'
import TemplateDetail from './pages/TemplateDetail'
import ActiveWorkout from './pages/WorkoutActive'
import ActivePulse from './pages/WorkoutDetail'
import MissionSummary from './pages/MissionSummary'
import CommunityFeed from './pages/Community'
import SignalFeed from './pages/SignalFeed'
import FindPartner from './pages/FindPartner'
import BattleLog from './pages/BattleLog'
import BattleComms from './pages/BattleComms'
import PRCelebration from './pages/PRCelebration'
import PersonalRecords from './pages/PersonalRecords'
import Challenges from './pages/Challenges'
import Profile from './pages/Profile'
import PostDetail from './pages/PostDetail'
import WorkoutHistory from './pages/WorkoutHistory'
import VipHub from './pages/VipHub'
import GymLocator from './pages/GymFinder'
import PhysiqueProtocol from './pages/PhysiqueLog'
import CommandSettings from './pages/Settings'
import IntegrationHub from './pages/IntegrationHub'
import SecureCheckout from './pages/SecureCheckout'

// ── VIP / Elite ──────────────────────────────────────
import VIPPaywall from './pages/VIPPaywall'
import VIPDashboard from './pages/VIPDashboard'
import VIPLounge from './pages/VipLounge'
import AdminDashboard from './pages/AdminDashboard'

// ── Route Guards ─────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, accessToken, user, logout, setUser } = useAuthStore()
  const location = useLocation()

  // Only hydrate from API when we have a token but no user object (e.g. hard refresh)
  useEffect(() => {
    if (accessToken && !user) {
      api.get('/users/me')
        .then(res => setUser(res.data))
        .catch(() => logout())
    }
  }, [accessToken, user, setUser, logout])

  if (!isAuthenticated && !accessToken) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />
  }
  return children
}

function VIPRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (!user || (user.role !== 'vip' && user.role !== 'admin')) {
    return <Navigate to="/vip-access" replace />
  }
  return children
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />
  }
  return children
}

// ── Main App ─────────────────────────────────────────
export default function App() {
  const { isAuthenticated, user } = useAuthStore()
  const { fetchInitialCount, addNotification } = useNotificationStore()

  useEffect(() => {
    if (isAuthenticated) {
      fetchInitialCount()
    }
  }, [isAuthenticated, fetchInitialCount])

  // Global WebSocket for real-time notifications
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return
    const apiBase = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000'
    const wsUrl = apiBase.replace(/^http/, 'ws') + `/ws/${user.id}`
    const ws = new WebSocket(wsUrl)
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.title) {
          addNotification({ id: crypto.randomUUID(), user_id: user.id, notification_type: data.type || 'system', title: data.title, body: data.body || null, metadata_json: null, is_read: false, created_at: new Date().toISOString() })
        }
      } catch { /* ignore malformed frames */ }
    }
    return () => ws.close()
  }, [isAuthenticated, user?.id, addNotification])

  const location = useLocation()

  return (
    <>
      <GlobalProgressBar />
      <ToastProvider />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* ── Public Auth ─────────────────────────────── */}
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/sign-up" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* ── Protected / Without Layout ─────────────── */}
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          <Route path="/workout/active" element={<ProtectedRoute><ActiveWorkout /></ProtectedRoute>} />
          <Route path="/workout/pulse" element={<ProtectedRoute><ActivePulse /></ProtectedRoute>} />
          <Route path="/pr-celebration" element={<ProtectedRoute><PRCelebration /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><SecureCheckout /></ProtectedRoute>} />

          {/* ── Protected / With Layout ────────────────── */}
          <Route element={<ProtectedRoute><PageWrapper /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />

            <Route path="/training" element={<TrainingGuides />} />
            <Route path="/training/:id" element={<ExerciseDetail />} />
            <Route path="/exercises" element={<ExerciseLibrary />} />
            <Route path="/templates/:id" element={<TemplateDetail />} />

            <Route path="/workout/summary/:id" element={<MissionSummary />} />

            <Route path="/feed" element={<CommunityFeed />} />
            <Route path="/signals" element={<SignalFeed />} />

            <Route path="/partners" element={<FindPartner />} />
            <Route path="/battle-log" element={<BattleLog />} />
            <Route path="/comms" element={<BattleComms />} />
            <Route path="/comms/:userId" element={<BattleComms />} />
            <Route path="/challenges" element={<Challenges />} />
            <Route path="/records" element={<PersonalRecords />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:id" element={<Profile />} />
            <Route path="/post/:id" element={<PostDetail />} />
            <Route path="/workout-history" element={<WorkoutHistory />} />
            <Route path="/vip-hub" element={<VIPRoute><VipHub /></VIPRoute>} />

            <Route path="/gyms" element={<GymLocator />} />
            <Route path="/physique" element={<PhysiqueProtocol />} />
            <Route path="/settings" element={<CommandSettings />} />
            <Route path="/integrations" element={<IntegrationHub />} />

            {/* VIP */}
            <Route path="/vip-access" element={<VIPPaywall />} />
            <Route path="/vip-dashboard" element={<VIPRoute><VIPDashboard /></VIPRoute>} />
            <Route path="/vip-lounge" element={<VIPRoute><VIPLounge /></VIPRoute>} />
          </Route>

          {/* Admin (No BottomNav Layout) */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

          {/* ── Catch-all ──────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </>
  )
}