interface Props { content: string; isMine: boolean; timestamp: string }

export default function MessageBubble({ content, isMine, timestamp }: Props) {
  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${isMine ? 'bg-primary-fixed text-background rounded-br-sm' : 'bg-surface-container-high text-on-surface rounded-bl-sm'}`}>
        <p className="text-sm font-body leading-relaxed">{content}</p>
        <p className={`text-[10px] mt-1 ${isMine ? 'text-background/60' : 'text-on-surface-variant'}`}>{timestamp}</p>
      </div>
    </div>
  )
}
