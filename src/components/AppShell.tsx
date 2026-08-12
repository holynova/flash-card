import { BookOpen, CloudOff, ExternalLink, Layers3, UserRound } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { repositoryMode } from '../data/repository'
import { Brand } from './Brand'

const items = [
  { to: '/', label: '今天', icon: BookOpen, end: true },
  { to: '/decks', label: '牌组', icon: Layers3, end: false },
  { to: '/me', label: '我的', icon: UserRound, end: false }
]

export function AppShell() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">跳到主要内容</a>
      <aside className="desktop-rail">
        <Brand compact />
        <nav aria-label="主导航">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} aria-label={label}>
              <Icon size={21} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <a className="desktop-rail__repo" href="https://github.com/holynova/flash-card" target="_blank" rel="noreferrer">
          <ExternalLink size={16} /> <span>GitHub</span>
        </a>
      </aside>
      <div className="app-content">
        {repositoryMode === 'demo' && (
          <div className="demo-banner" role="status">
            <CloudOff size={15} /> 本地演示模式，接入 Supabase 后自动启用云同步
          </div>
        )}
        <main id="main-content"><Outlet /></main>
      </div>
      <nav className="bottom-nav" aria-label="主导航">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}>
            <Icon size={22} />
            <span>{label}</span>
          </NavLink>
        ))}
        <a href="https://github.com/holynova/flash-card" target="_blank" rel="noreferrer" aria-label="GitHub">
          <ExternalLink size={22} />
          <span>GitHub</span>
        </a>
      </nav>
    </div>
  )
}
