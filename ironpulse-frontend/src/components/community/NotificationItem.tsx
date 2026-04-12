import type { Notification } from '../../types/community'

interface Props { notification: Notification; onRead: () => void }

const icons: Record<string, string> = { pr: 'emoji_events', challenge: 'swords', social: 'favorite', system: 'info' }

export default function NotificationItem({ notification, onRead }: Props) {
  return (
    <div onClick={onRead} className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors ${notification.is_read ? 'opacity-60' : 'bg-surface-container-high'}`}>
      <div className="w-9 h-9 rounded-full bg-surface-container-highest flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-filled text-primary-fixed text-lg">{icons[notification.notification_type] || 'circle_notifications'}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-headline font-bold text-on-surface">{notification.title}</p>
        {notification.body && <p className="text-xs text-on-surface-variant font-body mt-0.5 line-clamp-2">{notification.body}</p>}
      </div>
      {!notification.is_read && <span className="w-2.5 h-2.5 rounded-full bg-primary-fixed flex-shrink-0 mt-1.5" />}
    </div>
  )
}
