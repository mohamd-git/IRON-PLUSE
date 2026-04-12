import { Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import TopHeader, { type TopHeaderProps } from './TopHeader'
import BottomNav from './BottomNav'
import type { ReactNode } from 'react'

interface PageWrapperProps {
  children?: ReactNode
  hideBottomNav?: boolean
  hideTopHeader?: boolean
  headerProps?: TopHeaderProps
}

export default function PageWrapper({ 
  children, 
  hideBottomNav = false, 
  hideTopHeader = false, 
  headerProps 
}: PageWrapperProps) {
  return (
    <div className="flex flex-col min-h-screen bg-[#0e0e0e] text-white">
      {!hideTopHeader && <TopHeader {...headerProps} />}
      <motion.main 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, transition: { duration: 0.2 } }}
        transition={{ duration: 0.3 }}
        className="flex-1 pt-24 pb-32 px-4 min-h-screen bg-[#0e0e0e] w-full max-w-lg mx-auto overflow-x-hidden"
      >
        {children || <Outlet />}
      </motion.main>
      {!hideBottomNav && <BottomNav />}
    </div>
  )
}
