import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, RotateCcw, WifiOff, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { repository } from '../data/repository'
import { createId } from '../lib/ids'
import { previewReview } from '../lib/scheduler'
import type { Card, RatingValue } from '../types'
import { ErrorState, Loading } from '../components/Feedback'

export function StudyPage() {
  const [params] = useSearchParams()
  const deckId = params.get('deck') ?? undefined
  const client = useQueryClient()
  const queueQuery = useQuery({ queryKey: ['study-queue', deckId], queryFn: () => repository.getStudyQueue(deckId), staleTime: Infinity })
  const [queue, setQueue] = useState<Card[]>([])
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [startedAt, setStartedAt] = useState(Date.now())
  const [online, setOnline] = useState(navigator.onLine)
  const [lastCard, setLastCard] = useState<Card | null>(null)

  useEffect(() => {
    if (queueQuery.data) setQueue(queueQuery.data)
  }, [queueQuery.data])
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update); window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])

  const card = queue[index]
  const previews = useMemo(() => card ? previewReview(card) : [], [card])
  const review = useMutation({
    mutationFn: (rating: RatingValue) => repository.submitReview({
      eventId: createId(),
      cardId: card.id,
      rating,
      reviewedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      expectedVersion: card.version
    }),
    onSuccess: (log) => {
      setLastCard(log.previousCard)
      setQueue((current) => current.map((item) => item.id === log.cardId ? log.resultingCard : item))
      setIndex((value) => value + 1)
      setRevealed(false)
      setStartedAt(Date.now())
      void client.invalidateQueries({ queryKey: ['today-summary'] })
      void client.invalidateQueries({ queryKey: ['decks'] })
    }
  })
  const undo = useMutation({
    mutationFn: () => repository.undoLastReview(),
    onSuccess: (restored) => {
      if (!restored || !lastCard) return
      setQueue((current) => current.map((item) => item.id === restored.id ? restored : item))
      setIndex((value) => Math.max(0, value - 1))
      setLastCard(null)
    }
  })

  if (queueQuery.isLoading) return <div className="study-page"><Loading label="正在安排今天的顺序" /></div>
  if (queueQuery.error) return <div className="study-page"><ErrorState message={queueQuery.error.message} onRetry={() => void queueQuery.refetch()} /></div>

  const total = queue.length
  const completed = Math.min(index, total)
  if (!card) {
    return (
      <main className="study-page study-complete" id="main-content">
        <div className="study-complete__mark"><Check size={34} /></div>
        <p className="eyebrow">本次学习完成</p>
        <h1>{total > 0 ? `${completed} 张卡片，已经安排好下次见面。` : '现在没有待学习的卡片。'}</h1>
        <p>{total > 0 ? '今天的进度已经保存。记忆需要一点时间生长。' : '你可以返回牌组添加新卡，或稍后再来。'}</p>
        <div className="completion-actions">
          {lastCard && <button className="button button--secondary" onClick={() => undo.mutate()} disabled={undo.isPending}><RotateCcw size={18} /> 撤销上一张</button>}
          <Link className="button button--primary" to="/">回到今天</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="study-page" id="main-content">
      <header className="study-header">
        <Link className="icon-button" to={deckId ? `/decks/${deckId}` : '/'} aria-label="退出学习"><X size={22} /></Link>
        <div className="study-progress" aria-label={`已完成 ${completed}，共 ${total} 张`}><span style={{ width: `${Math.max(4, (completed / total) * 100)}%` }} /></div>
        <span className="study-count">{completed + 1}/{total}</span>
      </header>
      {!online && <div className="offline-pill" role="status"><WifiOff size={15} /> 离线学习，答案将在联网后同步</div>}
      <section className={`study-card${revealed ? ' study-card--revealed' : ''}`} aria-live="polite">
        <div className="study-card__section">
          <span className="side-label">问题</span>
          <p>{card.front}</p>
        </div>
        {revealed && (
          <div className="study-card__section study-card__answer">
            <span className="side-label">答案</span>
            <p>{card.back || '这张卡片没有填写背面'}</p>
          </div>
        )}
      </section>
      <div className="study-actions">
        {!revealed ? (
          <button className="button button--primary button--reveal" onClick={() => setRevealed(true)}>显示答案</button>
        ) : (
          <div className="rating-grid" aria-label="选择记忆程度">
            {previews.map((preview) => (
              <button key={preview.rating} className={`rating-button rating-button--${preview.rating}`} onClick={() => review.mutate(preview.rating)} disabled={review.isPending}>
                <span>{preview.label}</span><small>{preview.intervalLabel}</small>
              </button>
            ))}
          </div>
        )}
        {lastCard && !revealed && index > 0 && <button type="button" className="undo-float" onClick={() => undo.mutate()} disabled={undo.isPending}><ArrowLeft size={16} /> 撤销上一张</button>}
        {review.error && <p className="inline-error" role="alert">{review.error.message}</p>}
      </div>
    </main>
  )
}
