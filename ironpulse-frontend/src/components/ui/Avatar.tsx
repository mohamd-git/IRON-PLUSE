interface AvatarProps { 
  src?: string | null
  name?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string 
}

const s = { 
  sm: 'w-8 h-8 text-xs', 
  md: 'w-10 h-10 text-sm', 
  lg: 'w-16 h-16 text-xl',
  xl: 'w-20 h-20 text-2xl'
}

export default function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  if (src) {
    return (
      <img 
        src={src} 
        alt={name || ''} 
        className={`${s[size]} rounded-full object-cover border-2 border-[#cafd00] ${className}`} 
      />
    )
  }
  
  const initials = name ? name.charAt(0).toUpperCase() : '?'
  
  return (
    <div className={`${s[size]} rounded-full bg-[#1a1a1a] border-2 border-[#cafd00] flex items-center justify-center font-headline font-black text-[#cafd00] ${className}`}>
      {initials}
    </div>
  )
}
