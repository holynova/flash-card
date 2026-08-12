import { LoaderCircle } from 'lucide-react'

export function Loading({ label = '正在整理卡片' }: { label?: string }) {
  return <div className="loading-state"><LoaderCircle className="spin" size={22} />{label}</div>
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="notice notice--error" role="alert">
      <strong>暂时无法加载</strong>
      <span>{message}</span>
      {onRetry && <button type="button" className="text-button" onClick={onRetry}>重新尝试</button>}
    </div>
  )
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="empty-state">
      <span className="empty-state__rule" />
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  )
}
