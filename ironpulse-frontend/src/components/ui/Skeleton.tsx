interface SkeletonProps { 
  className?: string
  variant?: 'text' | 'card' | 'avatar' | 'bar'
}

export default function Skeleton({ variant = 'text', className = '' }: SkeletonProps) {
  let baseClass = ''
  
  switch(variant) {
    case 'text':
      baseClass = 'h-4 w-full rounded'
      break
    case 'card':
      baseClass = 'h-32 w-full rounded-2xl'
      break
    case 'avatar':
      baseClass = 'rounded-full w-10 h-10'
      break
    case 'bar':
      baseClass = 'h-8 w-full rounded'
      break
  }

  return <div className={`animate-pulse bg-[#262626] ${baseClass} ${className}`} />
}
