import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'

export function PageHeader({ eyebrow, title, description, back, action }: {
  eyebrow?: string
  title: string
  description?: string
  back?: boolean
  action?: ReactNode
}) {
  const navigate = useNavigate()
  return (
    <header className="page-header">
      <div className="page-header__row">
        {back && (
          <button type="button" className="icon-button" onClick={() => navigate(-1)} aria-label="返回">
            <ArrowLeft size={21} />
          </button>
        )}
        <div className="page-header__copy">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {action && <div className="page-header__action">{action}</div>}
      </div>
    </header>
  )
}
