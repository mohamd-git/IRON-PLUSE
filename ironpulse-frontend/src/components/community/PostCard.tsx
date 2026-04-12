import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import api from '../../api/client'
import Avatar from '../ui/Avatar'
import Button from '../ui/Button'

interface PostProps {
  post: any
}

export default function PostCard({ post }: PostProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isLiked, setIsLiked] = useState(post.is_liked || false)
  const [likeCount, setLikeCount] = useState(post.like_count || 0)

  const handleLike = async () => {
    // Optimistic UI update
    const previousState = isLiked
    const previousCount = likeCount
    
    setIsLiked(!previousState)
    setLikeCount(previousState ? previousCount - 1 : previousCount + 1)

    try {
      await api.post(`/posts/${post.id}/like`)
      queryClient.invalidateQueries({ queryKey: ['feedPosts'] })
    } catch {
      setIsLiked(previousState)
      setLikeCount(previousCount)
    }
  }

  // Engine separating post types
  const renderContent = () => {
    switch (post.post_type) {
      case 'workout_log':
        return (
          <div className="bg-[#262626] rounded-xl p-4 mt-2">
            <div className="flex justify-between items-start mb-2">
              <span className="font-headline font-bold text-sm uppercase">{post.metadata?.workout_name || 'Tactical Session'}</span>
              <span className="text-[#cafd00] font-headline font-black uppercase text-sm tracking-widest">{post.metadata?.volume} LBS VOL</span>
            </div>
            <p className="text-[#adaaaa] font-body text-xs">{post.content}</p>
          </div>
        )
      case 'pr_celebration':
        return (
          <div className="mt-3 relative rounded-2xl overflow-hidden bg-[#262626] h-48">
            <img src={post.image_url || 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=800'} alt="PR Celebration" className="w-full h-full object-cover mix-blend-luminosity opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] to-transparent p-4 flex flex-col justify-end">
              <span className="bg-[#cafd00] text-black font-headline font-black text-[10px] px-2 py-1 rounded w-fit mb-2 uppercase">NEW PR LOCKED</span>
              <p className="font-headline font-black italic text-2xl text-white uppercase tracking-tighter shadow-sm">{post.content}</p>
            </div>
          </div>
        )
      case 'challenge':
        return (
          <div className="mt-3 rounded-2xl border-2 border-[#c00018]/50 bg-[#1a1a1a] p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#c00018]/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-filled text-[#ff7168] text-xl">bolt</span>
              <span className="font-headline font-black italic text-[#ff7168] tracking-widest uppercase">BATTLE CHALLENGE</span>
            </div>
            <p className="text-white font-body text-sm mb-4 leading-relaxed">{post.content}</p>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1">ACCEPT</Button>
              <Button variant="outline" size="sm" className="flex-1">DECLINE</Button>
            </div>
          </div>
        )
      case 'physique':
        return (
          <div className="mt-3 space-y-2">
            <p className="text-white font-body text-sm leading-relaxed mb-2">{post.content}</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="aspect-square bg-[#262626] rounded-xl overflow-hidden"><img src="https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=400" className="w-full h-full object-cover grayscale mix-blend-luminosity"/></div>
              <div className="aspect-square bg-[#262626] rounded-xl overflow-hidden"><img src="https://images.unsplash.com/photo-1599058917212-d750089bc07e?q=80&w=400" className="w-full h-full object-cover grayscale mix-blend-luminosity"/></div>
            </div>
          </div>
        )
      case 'motivational':
        return (
          <div className="mt-4 p-6 bg-[#cafd00]/5 rounded-2xl border-l-4 border-[#cafd00]">
            <p className="font-headline font-black italic text-xl text-white tracking-tighter uppercase leading-snug">"{post.content}"</p>
          </div>
        )
      default:
        // Generic Text Post
        return <p className="text-white font-body text-sm mt-3 leading-relaxed">{post.content}</p>
    }
  }

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#1a1a1a] border border-[#484847]/30 rounded-3xl p-5 mb-4 text-white"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-3">
          <Avatar src={post.user?.avatar_url} name={post.user?.display_name} size="md" className="border-none" />
          <div className="flex flex-col">
            <span className="font-headline font-bold text-sm tracking-wider uppercase leading-none">{post.user?.display_name || 'OPERATOR'}</span>
            <span className="text-[#adaaaa] font-label text-[10px] uppercase font-semibold mt-1">{post.created_at_formatted || '2 HOURS AGO'}</span>
          </div>
        </div>
        <button className="text-[#adaaaa] hover:text-white transition-colors">
          <span className="material-symbols-outlined text-lg">more_horiz</span>
        </button>
      </div>

      {/* Dynamic Body Component */}
      {renderContent()}

      {/* Engagement Row */}
      <div className="flex items-center gap-6 mt-4 pt-4 border-t border-[#484847]/30">
        <motion.button 
          whileTap={{ scale: 1.3 }}
          transition={{ type: 'spring', stiffness: 400, damping: 10 }}
          onClick={handleLike} 
          className={`flex items-center gap-1.5 text-xs font-label font-bold transition-colors duration-200 ${isLiked ? 'text-[#cafd00]' : 'text-[#adaaaa] hover:text-white'}`}
        >
          <span className={`material-symbols-outlined text-lg ${isLiked ? 'font-variation-fill' : ''}`}>favorite</span>
          {likeCount}
        </motion.button>
        <button onClick={() => navigate(`/post/${post.id}`)} className="flex items-center gap-1.5 text-xs font-label font-bold text-[#adaaaa] hover:text-white transition-colors">
          <span className="material-symbols-outlined text-lg">chat_bubble</span>
          {post.comment_count || 0}
        </button>
        <button className="flex items-center gap-1.5 text-xs font-label font-bold text-[#adaaaa] hover:text-white transition-colors ml-auto">
          <span className="material-symbols-outlined text-lg">ios_share</span>
        </button>
      </div>
    </motion.div>
  )
}
