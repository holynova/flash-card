import { Sprout } from 'lucide-react'

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" aria-label="苔卡 Moss Card">
      <span className="brand__mark"><Sprout size={compact ? 18 : 22} strokeWidth={2.2} /></span>
      {!compact && <span className="brand__name">苔卡</span>}
    </div>
  )
}
