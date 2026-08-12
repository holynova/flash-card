import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Clock3, Flame, Leaf, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { repository } from '../data/repository'
import { ErrorState, Loading } from '../components/Feedback'
import { formatLongDate } from '../lib/time'

export function TodayPage() {
  const summary = useQuery({ queryKey: ['today-summary'], queryFn: () => repository.getTodaySummary() })
  const decks = useQuery({ queryKey: ['decks'], queryFn: () => repository.listDecks() })

  if (summary.isLoading || decks.isLoading) return <Loading />
  if (summary.error || decks.error) return <ErrorState message={(summary.error ?? decks.error)?.message ?? '未知错误'} onRetry={() => { void summary.refetch(); void decks.refetch() }} />
  const data = summary.data!
  const total = data.due + data.fresh

  return (
    <div className="page today-page">
      <header className="today-header">
        <div><p className="eyebrow">{formatLongDate()}</p><h1>今天</h1></div>
        <div className="streak" aria-label={`连续学习 ${data.streak} 天`}><Flame size={18} /> <strong>{data.streak}</strong><span>天</span></div>
      </header>

      <section className="today-focus" aria-labelledby="today-focus-title">
        <div className="today-focus__top">
          <div>
            <p className="eyebrow">今日安排</p>
            <h2 id="today-focus-title">{total > 0 ? `还有 ${total} 张` : '今天已经学完'}</h2>
          </div>
          <div className="leaf-orbit"><Leaf size={25} /></div>
        </div>
        <div className="today-numbers">
          <div><strong>{data.due}</strong><span>待复习</span></div>
          <div><strong>{data.fresh}</strong><span>新卡</span></div>
          <div><strong>{data.completed}</strong><span>已完成</span></div>
        </div>
        <div className="time-estimate"><Clock3 size={17} /> 预计 {data.estimatedMinutes} 分钟</div>
        {total > 0 ? (
          <Link className="button button--primary button--large" to="/study">开始今天的学习 <ArrowRight size={19} /></Link>
        ) : (
          <Link className="button button--secondary button--large" to="/decks"><RotateCcw size={18} /> 浏览牌组</Link>
        )}
      </section>

      <section className="section-block">
        <div className="section-heading"><div><p className="eyebrow">按牌组</p><h2>今天从哪里开始</h2></div><Link to="/decks">全部</Link></div>
        <div className="deck-lines">
          {decks.data!.map((deck) => {
            const deckTotal = deck.dueCards + Math.min(deck.newCards, deck.newCardsPerDay)
            const progress = deckTotal + deck.completedToday === 0 ? 0 : Math.round((deck.completedToday / (deckTotal + deck.completedToday)) * 100)
            return (
              <Link className="deck-line" to={`/study?deck=${deck.id}`} key={deck.id}>
                <div className="deck-line__index">{String(decks.data!.indexOf(deck) + 1).padStart(2, '0')}</div>
                <div className="deck-line__body">
                  <div><strong>{deck.name}</strong><span>{deckTotal > 0 ? `${deckTotal} 张待学` : '今日完成'}</span></div>
                  <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
                </div>
                <ArrowRight size={18} />
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
