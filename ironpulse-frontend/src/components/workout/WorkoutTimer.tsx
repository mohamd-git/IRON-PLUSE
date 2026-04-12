interface Props { elapsed: string; isActive: boolean }
export default function WorkoutTimer({ elapsed, isActive }: Props) {
  return (
    <div className="flex items-center gap-2 bg-surface-container border border-outline-variant rounded-2xl px-4 py-3">
      <span className={`material-symbols-filled text-2xl ${isActive ? 'text-primary-fixed' : 'text-outline'}`}>timer</span>
      <span className="font-headline text-2xl font-black text-on-surface tabular-nums">{elapsed}</span>
      {isActive && <span className="w-2 h-2 rounded-full bg-primary-fixed animate-pulse ml-1" />}
    </div>
  )
}
