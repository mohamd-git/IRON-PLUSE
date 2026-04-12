import Avatar from '../ui/Avatar'

interface Story { id: string; username: string; avatar_url: string | null; hasNew?: boolean }
interface Props { stories: Story[] }

export default function StoryRow({ stories }: Props) {
  return (
    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
      {stories.map((s) => (
        <div key={s.id} className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className={`p-0.5 rounded-full ${s.hasNew ? 'bg-gradient-to-br from-primary-fixed to-secondary' : 'bg-outline-variant'}`}>
            <Avatar src={s.avatar_url} name={s.username} size="md" className="border-2 border-background" />
          </div>
          <span className="text-[10px] font-label text-on-surface-variant truncate w-14 text-center">{s.username}</span>
        </div>
      ))}
    </div>
  )
}
