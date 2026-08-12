import { Link } from 'react-router-dom'
import { Sprout } from 'lucide-react'

export function NotFoundPage() {
  return (
    <main className="not-found-page" id="main-content">
      <Sprout size={34} />
      <p className="eyebrow">404</p>
      <h1>这张卡片不在这里。</h1>
      <p>页面可能已经移动，回到今天继续学习吧。</p>
      <Link className="button button--primary" to="/">回到今天</Link>
    </main>
  )
}
