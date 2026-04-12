import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  hover?: boolean
}

export default function Card({ children, className = '', onClick, hover = false }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-surface-container border border-outline-variant rounded-2xl p-4 ${hover ? 'hover:bg-surface-container-high hover:border-outline cursor-pointer transition-all' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
