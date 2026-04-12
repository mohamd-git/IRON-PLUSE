import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import api from '../api/client'
import { useAuthStore } from '../store/authStore'
import TopHeader from '../components/layout/TopHeader'
import Avatar from '../components/ui/Avatar'
import Skeleton from '../components/ui/Skeleton'

const MOCK_POST = {
  id: '1',
  post_type: 'pr_celebration',
  content: '315LBS DEADLIFT. 2 years of grinding.',
  like_count: 47,
  is_liked: false,
  created_at_formatted: '3 HOURS AGO',
  user: { id: 'u1', display_name: 'SARAH_K', avatar_url: null },
  image_url: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=800',
}

const MOCK_COMMENTS = [
  { id: 'c1', content: 'Absolute beast mode. Respect.', created_at_formatted: '2H AGO', user: { display_name: 'IRON_WOLF', avatar_url: null } },
  { id: 'c2', content: 'That form looked locked in. What program are you running?', created_at_formatted: '1H AGO', user: { display_name: 'COMMANDER_X', avatar_url: null } },
  { id: 'c3', content: 'Your posterior chain is unreal. Inspiring.', created_at_formatted: '45M AGO', user: { display_name: 'TITAN_89', avatar_url: null } },
]

export default function PostDetail() {
  const { id } = useParams()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)

  const { data: post, isLoading: postLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: async () => {
      try {
        const res = await api.get(`/posts/${id}`)
        setIsLiked(res.data.is_liked)
        setLikeCount(res.data.like_count)
        return res.data
      } catch {
        setIsLiked(MOCK_POST.is_liked)
        setLikeCount(MOCK_POST.like_count)
        return MOCK_POST
      }
    }
  })

  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ['comments', id],
    queryFn: async () => {
      try {
        const res = await api.get(`/posts/${id}/comments`)
        return res.data
      } catch {
        return MOCK_COMMENTS
      }
    }
  })

  const handleLike = async () => {
    const prev = isLiked
    setIsLiked(!prev)
    setLikeCount(c => prev ? c - 1 : c + 1)
    try {
      await api.post(`/posts/${id}/like`)
    } catch {
      setIsLiked(prev)
      setLikeCount(c => prev ? c + 1 : c - 1)
    }
  }

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return
    setSubmitting(true)
    const optimistic = {
      id: crypto.randomUUID(),
      content: commentText,
      created_at_formatted: 'JUST NOW',
      user: { display_name: user?.display_name || 'YOU', avatar_url: user?.avatar_url }
    }
    queryClient.setQueryData(['comments', id], (old: any[]) => [...(old || []), optimistic])
    setCommentText('')
    try {
      await api.post(`/posts/${id}/comments`, { content: optimistic.content })
      queryClient.invalidateQueries({ queryKey: ['comments', id] })
    } catch { /* keep optimistic */ }
    setSubmitting(false)
  }

  return (
    <div className="bg-[#0e0e0e] min-h-screen text-white flex flex-col">
      <TopHeader showBack showDesktopNav={false} />

      <div className="w-full max-w-lg mx-auto pt-16 pb-32">
        {/* Post */}
        {postLoading ? (
          <Skeleton variant="card" className="h-[300px] rounded-none" />
        ) : (
          <div className="bg-[#1a1a1a] border-b border-[#484847]/30">
            {/* Hero image for pr_celebration / physique */}
            {post?.image_url && (
              <div className="aspect-video w-full overflow-hidden">
                <img src={post.image_url} alt="post" className="w-full h-full object-cover mix-blend-luminosity opacity-80" />
              </div>
            )}

            <div className="p-5">
              {/* Author */}
              <div className="flex items-center gap-3 mb-4">
                <Avatar src={post?.user?.avatar_url} name={post?.user?.display_name} size="md" />
                <div>
                  <p className="font-headline font-bold text-sm uppercase tracking-wider">{post?.user?.display_name}</p>
                  <p className="font-label text-[10px] text-[#adaaaa] uppercase tracking-widest">{post?.created_at_formatted}</p>
                </div>
              </div>

              {/* Content */}
              <p className="font-body text-white text-sm leading-relaxed mb-5">{post?.content}</p>

              {/* Actions */}
              <div className="flex items-center gap-6 pt-4 border-t border-[#484847]/30">
                <motion.button
                  whileTap={{ scale: 1.3 }}
                  onClick={handleLike}
                  className={`flex items-center gap-1.5 text-sm font-label font-bold transition-colors ${isLiked ? 'text-[#cafd00]' : 'text-[#adaaaa]'}`}
                >
                  <span className="material-symbols-outlined text-xl">favorite</span>
                  {likeCount}
                </motion.button>
                <span className="flex items-center gap-1.5 text-sm font-label font-bold text-[#adaaaa]">
                  <span className="material-symbols-outlined text-xl">chat_bubble</span>
                  {comments?.length || 0}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="px-4 pt-4 space-y-4">
          <p className="font-label text-[10px] font-bold tracking-widest text-[#adaaaa] uppercase">
            {comments?.length || 0} TRANSMISSIONS
          </p>

          {commentsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} variant="text" className="h-16" />)}
            </div>
          ) : (
            <div className="space-y-4">
              {(comments || []).map((c: any, i: number) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex gap-3"
                >
                  <Avatar src={c.user?.avatar_url} name={c.user?.display_name} size="sm" className="shrink-0 mt-0.5" />
                  <div className="flex-1 bg-[#1a1a1a] border border-[#484847]/30 rounded-2xl rounded-tl-sm p-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-headline font-bold text-xs uppercase tracking-wider">{c.user?.display_name}</span>
                      <span className="font-label text-[9px] text-[#adaaaa] tracking-widest">{c.created_at_formatted}</span>
                    </div>
                    <p className="font-body text-sm text-[#adaaaa] leading-relaxed">{c.content}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Comment input — fixed at bottom */}
      <div className="fixed bottom-0 w-full max-w-lg left-1/2 -translate-x-1/2 bg-[#0e0e0e] border-t border-[#484847]/30 px-4 py-3 z-40">
        <form onSubmit={handleComment} className="flex gap-3 items-center">
          <Avatar src={user?.avatar_url} name={user?.display_name} size="sm" className="shrink-0" />
          <input
            type="text"
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            placeholder="Add a transmission..."
            className="flex-1 bg-[#1a1a1a] border border-[#484847]/50 rounded-xl px-4 py-2.5 text-white font-body text-sm placeholder-[#484847] outline-none focus:border-[#cafd00] transition-colors"
          />
          <button
            type="submit"
            disabled={!commentText.trim() || submitting}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#cafd00] text-black disabled:opacity-40 shrink-0 transition-opacity"
          >
            <span className="material-symbols-filled text-lg">send</span>
          </button>
        </form>
      </div>
    </div>
  )
}
