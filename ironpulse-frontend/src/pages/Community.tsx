import { useState, useRef } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useNotificationStore } from '../store/notificationStore'
import { useAuthStore } from '../store/authStore'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import api from '../api/client'

import PostCard from '../components/community/PostCard'
import Skeleton from '../components/ui/Skeleton'
import Avatar from '../components/ui/Avatar'

const TRENDING = ['#LEGDAY', '#IRONPULSECHALLENGE', '#PRBREAK', '#HYPERTROPHY', '#TACTICAL']

const MOCK_STORIES = [
  { id: 1, name: 'Agent_1', seed: 'agent1', seen: false },
  { id: 2, name: 'Agent_2', seed: 'agent2', seen: true },
  { id: 3, name: 'Agent_3', seed: 'agent3', seen: false },
  { id: 4, name: 'Agent_4', seed: 'agent4', seen: false },
  { id: 5, name: 'Agent_5', seed: 'agent5', seen: true },
]

export default function CommunityFeed() {
  const unreadCount = useNotificationStore(s => s.unreadCount)
  const { user } = useAuthStore()

  // Search
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Story viewer
  const [activeStory, setActiveStory] = useState<{ name: string; src: string } | null>(null)

  // Story upload
  const storyInputRef = useRef<HTMLInputElement>(null)
  const [storyPreview, setStoryPreview] = useState<string | null>(null)
  const [storyUploading, setStoryUploading] = useState(false)
  const [storySuccess, setStorySuccess] = useState(false)

  const handleStorySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setStoryPreview(url)
  }

  const handleStoryPost = () => {
    setStoryUploading(true)
    setTimeout(() => {
      setStoryUploading(false)
      setStorySuccess(true)
      setStoryPreview(null)
      setTimeout(() => setStorySuccess(false), 2500)
    }, 1500)
  }

  // Feed
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['feedPosts'],
    queryFn: async ({ pageParam = null }) => {
      try {
        const url = pageParam ? `/posts?cursor=${pageParam}&limit=10` : '/posts?limit=10'
        const res = await api.get(url)
        return res.data
      } catch {
        return {
          posts: pageParam ? [] : [
            { id: '1', post_type: 'workout_log', user: { display_name: 'COMMANDER X' }, content: 'Crushed the lower body protocols today. Squats, leg press, hamstring curls. Pure suffering. #LEGDAY #HYPERTROPHY', metadata: { volume: 22000 } },
            { id: '2', post_type: 'pr_celebration', user: { display_name: 'SARAH_K' }, content: '315LBS DEADLIFT locked in. New PR. Nothing stops the grind. #PRBREAK #IRONPULSECHALLENGE', metadata: {} },
            { id: '3', post_type: 'motivational', user: { display_name: 'Elias_VT' }, content: 'REST IS A WEAPON ONLY WHEN EARNED. Stay #TACTICAL. #HYPERTROPHY block week 6 complete.', metadata: {} },
            { id: '4', post_type: 'physique', user: { display_name: 'MARCUS' }, content: 'Dialing in the macros. 12 weeks out from selection. #IRONPULSECHALLENGE #HYPERTROPHY', metadata: {} },
            { id: '5', post_type: 'challenge', user: { display_name: 'HUDSON' }, content: "I challenge anyone to a 50-rep unbroken pullup set. #IRONPULSECHALLENGE — Let's see the blood.", metadata: {} },
            { id: '6', post_type: 'workout_log', user: { display_name: 'TITAN_K' }, content: 'Back day done. 180kg deadlift x5. Volume was insane. #PRBREAK #HYPERTROPHY', metadata: { volume: 18000 } },
            { id: '7', post_type: 'motivational', user: { display_name: 'REAPER_09' }, content: 'Another #LEGDAY in the books. Quad dominant split is paying off. Stay #TACTICAL.', metadata: {} },
          ],
          next_cursor: null
        }
      }
    },
    getNextPageParam: (lastPage) => lastPage.next_cursor || undefined,
    initialPageParam: null
  })

  const observerTarget = useInfiniteScroll({
    onLoadMore: () => fetchNextPage(),
    hasMore: !!hasNextPage && !isFetchingNextPage
  })

  const allPosts = data?.pages.flatMap(p => p.posts) ?? []
  const filteredPosts = searchQuery
    ? (() => {
        // Strip leading # so "#LEGDAY" matches "LEGDAY" and "#legday" in content
        const q = searchQuery.replace(/^#/, '').toLowerCase()
        return allPosts.filter(p =>
          p.content?.toLowerCase().includes(q) ||
          p.user?.display_name?.toLowerCase().includes(q) ||
          p.post_type?.toLowerCase().includes(q)
        )
      })()
    : allPosts

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white pt-[76px] pb-24 w-full max-w-lg mx-auto">

      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-[#0e0e0e]/80 backdrop-blur-xl h-16 border-b border-[#484847]/30 flex items-center justify-between px-4 max-w-lg left-1/2 -translate-x-1/2">
        <Link to="/" className="font-headline text-xl font-black text-white italic tracking-tighter">IRON PULSE</Link>
        <div className="flex gap-4 items-center">
          <button
            onClick={() => { setSearchOpen(true); setSearchQuery('') }}
            className="text-[#adaaaa] hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-xl">search</span>
          </button>
          <Link to="/signals" className="relative text-[#adaaaa] hover:text-white transition-colors">
            <span className="material-symbols-outlined text-xl">notifications</span>
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#ff7168] rounded-full border-2 border-[#0e0e0e]" />}
          </Link>
        </div>
      </header>

      {/* ── Search Overlay ─────────────────────────────── */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col"
          >
            <div className="flex items-center gap-3 px-4 h-16 border-b border-[#484847]/30">
              <span className="material-symbols-outlined text-[#adaaaa]">search</span>
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search posts, agents..."
                className="flex-1 bg-transparent text-white font-body text-sm outline-none placeholder-[#484847]"
              />
              <button onClick={() => setSearchOpen(false)} className="text-[#adaaaa] hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {searchQuery.length === 0 && (
                <div>
                  <p className="font-label text-[9px] uppercase tracking-widest text-[#484847] font-bold mb-3">TRENDING</p>
                  {TRENDING.map(t => (
                    <button
                      key={t}
                      onClick={() => setSearchQuery(t)}
                      className="flex items-center gap-3 w-full py-3 border-b border-[#484847]/20 text-left hover:opacity-70 transition-opacity"
                    >
                      <span className="material-symbols-outlined text-[#484847] text-base">tag</span>
                      <span className="font-headline font-bold text-sm text-white uppercase tracking-wider">{t}</span>
                    </button>
                  ))}
                </div>
              )}
              {searchQuery.length > 0 && filteredPosts.length === 0 && (
                <p className="text-[#484847] font-body text-sm text-center mt-12">No results for "{searchQuery}"</p>
              )}
              {searchQuery.length > 0 && filteredPosts.map((post: any) => (
                <div key={post.id} className="bg-[#1a1a1a] rounded-2xl p-4 border border-[#484847]/30">
                  <p className="font-headline font-bold text-xs text-[#cafd00] uppercase mb-1">{post.user?.display_name}</p>
                  <p className="font-body text-sm text-white">{post.content}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Story Viewer ───────────────────────────────── */}
      <AnimatePresence>
        {activeStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveStory(null)}
            className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center"
          >
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar size="sm" src={activeStory.src} name={activeStory.name} />
                <span className="font-headline font-bold text-sm text-white uppercase">{activeStory.name}</span>
              </div>
              <button onClick={() => setActiveStory(null)} className="text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <img
              src={activeStory.src}
              alt={activeStory.name}
              className="max-h-[80vh] max-w-full object-contain rounded-2xl"
              onClick={e => e.stopPropagation()}
            />
            <p className="text-[#adaaaa] font-label text-[10px] uppercase tracking-widest mt-4">Tap anywhere to close</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Story Upload Preview ────────────────────────── */}
      <AnimatePresence>
        {storyPreview && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center gap-6 px-6"
          >
            <p className="font-headline font-black text-lg uppercase tracking-tighter text-white">Post Intel</p>
            <img src={storyPreview} alt="Story preview" className="max-h-[60vh] max-w-full rounded-3xl object-contain border border-[#484847]" />
            <div className="flex gap-4 w-full max-w-xs">
              <button
                onClick={() => setStoryPreview(null)}
                className="flex-1 py-3 rounded-2xl bg-[#1a1a1a] border border-[#484847] text-white font-headline font-black text-sm uppercase tracking-widest"
              >
                CANCEL
              </button>
              <button
                onClick={handleStoryPost}
                disabled={storyUploading}
                className="flex-1 py-3 rounded-2xl bg-[#cafd00] text-black font-headline font-black text-sm uppercase tracking-widest disabled:opacity-60"
              >
                {storyUploading ? 'POSTING...' : 'POST'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success toast */}
      <AnimatePresence>
        {storySuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[300] bg-[#cafd00] text-black font-headline font-black text-xs uppercase tracking-widest px-6 py-3 rounded-full"
          >
            Intel Posted
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden file input for story upload */}
      <input
        ref={storyInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleStorySelect}
      />

      {/* Stories Row */}
      <div className="pl-4 pb-6 overflow-hidden">
        <div className="flex gap-4 overflow-x-auto custom-scrollbar pr-4 pb-2">
          {/* Add Intel button */}
          <div
            onClick={() => storyInputRef.current?.click()}
            className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#484847] hover:border-[#cafd00] flex items-center justify-center bg-[#1a1a1a] transition-colors">
              <span className="material-symbols-outlined text-[#adaaaa]">add</span>
            </div>
            <span className="font-label text-[10px] uppercase text-[#adaaaa] tracking-widest font-bold">Add Intel</span>
          </div>

          {/* Story avatars */}
          {MOCK_STORIES.map(s => (
            <div
              key={s.id}
              onClick={() => setActiveStory({
                name: s.name,
                src: `https://api.dicebear.com/9.x/personas/svg?seed=${s.seed}&backgroundColor=1a1a1a`
              })}
              className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
            >
              <div className={`w-16 h-16 rounded-full p-0.5 ${s.seen ? 'border-2 border-[#484847]' : 'border-2 border-[#cafd00]'}`}>
                <img
                  src={`https://api.dicebear.com/9.x/personas/svg?seed=${s.seed}&backgroundColor=1a1a1a`}
                  className="w-full h-full object-cover rounded-full mix-blend-luminosity group-hover:mix-blend-normal transition-all"
                />
              </div>
              <span className="font-label text-[10px] uppercase text-white tracking-widest font-bold">{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Trending Chips */}
      <div className="px-4 mb-6 relative">
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#0e0e0e] to-transparent z-10 pointer-events-none" />
        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 relative z-0">
          {TRENDING.map((t, idx) => (
            <button
              key={idx}
              onClick={() => { setSearchOpen(true); setSearchQuery(t) }}
              className="shrink-0 px-4 py-1.5 rounded-full bg-[#1a1a1a] border border-[#484847]/50 text-[#adaaaa] hover:text-white font-headline text-xs font-bold uppercase tracking-wider transition-colors hover:border-[#cafd00]"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="px-4 space-y-4">
        {isLoading ? (
          <div><Skeleton variant="card" className="h-[250px] mb-4" /><Skeleton variant="card" className="h-[150px]" /></div>
        ) : (
          <AnimatePresence>
            {data?.pages.map((group, i) => (
              <div key={i}>
                {group.posts.map((post: any) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            ))}
          </AnimatePresence>
        )}
        <div ref={observerTarget} className="h-12 flex justify-center w-full py-4">
          {isFetchingNextPage && <span className="material-symbols-outlined animate-spin text-[#cafd00]">progress_activity</span>}
        </div>
      </div>
    </div>
  )
}
