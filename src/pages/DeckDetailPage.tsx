import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Download, FileUp, MoreHorizontal, Pause, Pencil, Play, Plus, Search, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { repository } from '../data/repository'
import { EmptyState, ErrorState, Loading } from '../components/Feedback'
import { FormField, TextArea, TextInput } from '../components/FormField'
import { PageHeader } from '../components/PageHeader'
import { downloadText } from '../lib/download'
import { toCardsCsv } from '../lib/csv'

export function DeckDetailPage() {
  const { deckId = '' } = useParams()
  const navigate = useNavigate()
  const client = useQueryClient()
  const [queryText, setQueryText] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingCardId, setEditingCardId] = useState<string | null>(null)
  const [editingDeck, setEditingDeck] = useState(false)
  const [deckName, setDeckName] = useState('')
  const [deckDescription, setDeckDescription] = useState('')
  const [newCardsPerDay, setNewCardsPerDay] = useState('10')
  const [desiredRetention, setDesiredRetention] = useState('90')
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [formError, setFormError] = useState('')
  const deck = useQuery({ queryKey: ['deck', deckId], queryFn: () => repository.getDeck(deckId) })
  const cards = useQuery({ queryKey: ['cards', deckId, queryText], queryFn: () => repository.listCards(deckId, queryText) })
  const saveCard = useMutation({
    mutationFn: () => editingCardId
      ? repository.updateCard(editingCardId, { front, back })
      : repository.createCard({ deckId, front, back }),
    onSuccess: async () => {
      setFront(''); setBack(''); setAdding(false); setEditingCardId(null)
      await client.invalidateQueries({ queryKey: ['cards', deckId] })
      await client.invalidateQueries({ queryKey: ['decks'] })
      await client.invalidateQueries({ queryKey: ['today-summary'] })
    },
    onError: (reason) => setFormError(reason instanceof Error ? reason.message : '无法保存卡片')
  })
  const saveDeck = useMutation({
    mutationFn: () => repository.updateDeck(deckId, {
      name: deckName,
      description: deckDescription,
      newCardsPerDay: Number(newCardsPerDay),
      desiredRetention: Number(desiredRetention) / 100
    }),
    onSuccess: async () => {
      setEditingDeck(false)
      await client.invalidateQueries({ queryKey: ['deck', deckId] })
      await client.invalidateQueries({ queryKey: ['decks'] })
      await client.invalidateQueries({ queryKey: ['today-summary'] })
    },
    onError: (reason) => setFormError(reason instanceof Error ? reason.message : '无法保存牌组')
  })
  const removeDeck = useMutation({
    mutationFn: () => repository.deleteDeck(deckId),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['decks'] })
      await client.invalidateQueries({ queryKey: ['today-summary'] })
      navigate('/decks')
    }
  })
  const suspendCard = useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) => repository.setCardSuspended(id, value),
    onSuccess: () => client.invalidateQueries({ queryKey: ['cards', deckId] })
  })
  const deleteCard = useMutation({
    mutationFn: (id: string) => repository.deleteCard(id),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['cards', deckId] })
      await client.invalidateQueries({ queryKey: ['decks'] })
    }
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    setFormError('')
    if (!front.trim()) { setFormError('正面不能为空'); return }
    saveCard.mutate()
  }

  function startAdding() {
    setEditingCardId(null)
    setFront('')
    setBack('')
    setFormError('')
    setAdding(true)
  }

  function startEditingDeck() {
    if (!deck.data) return
    setDeckName(deck.data.name)
    setDeckDescription(deck.data.description)
    setNewCardsPerDay(String(deck.data.newCardsPerDay))
    setDesiredRetention(String(Math.round(deck.data.desiredRetention * 100)))
    setFormError('')
    setEditingDeck((value) => !value)
  }

  if (deck.isLoading || cards.isLoading) return <Loading />
  if (deck.error || cards.error) return <ErrorState message={(deck.error ?? cards.error)?.message ?? '无法打开牌组'} onRetry={() => { void deck.refetch(); void cards.refetch() }} />
  if (!deck.data) return <EmptyState title="牌组不存在" description="它可能已被删除。" action={<button className="button button--secondary" onClick={() => navigate('/decks')}>返回牌组</button>} />

  const dueCount = deck.data.dueCards + Math.min(deck.data.newCards, deck.data.newCardsPerDay)

  return (
    <div className="page deck-detail-page">
      <PageHeader back eyebrow={`${deck.data.totalCards} 张卡片`} title={deck.data.name} description={deck.data.description || '给这副牌组添加一句简短说明，会更容易记得它的目的。'} action={<button type="button" className="icon-button" aria-label="牌组设置" aria-expanded={editingDeck} onClick={startEditingDeck}><MoreHorizontal size={21} /></button>} />
      {editingDeck && (
        <form className="inline-form deck-settings-form" onSubmit={(event) => { event.preventDefault(); setFormError(''); saveDeck.mutate() }}>
          <FormField label="牌组名称" error={!deckName.trim() ? '名称不能为空' : undefined}><TextInput value={deckName} onChange={(event) => setDeckName(event.target.value)} maxLength={80} required /></FormField>
          <FormField label="说明"><TextArea value={deckDescription} onChange={(event) => setDeckDescription(event.target.value)} rows={2} maxLength={240} /></FormField>
          <div className="deck-settings-grid">
            <FormField label="每日新卡"><TextInput type="number" min="0" max="200" value={newCardsPerDay} onChange={(event) => setNewCardsPerDay(event.target.value)} required /></FormField>
            <FormField label="目标记忆率 %"><TextInput type="number" min="70" max="97" value={desiredRetention} onChange={(event) => setDesiredRetention(event.target.value)} required /></FormField>
          </div>
          {formError && <p className="inline-error" role="alert">{formError}</p>}
          <div className="form-actions form-actions--spread">
            <button type="button" className="button button--ghost button--danger-text" onClick={() => { if (window.confirm('删除整个牌组、卡片与复习记录？此操作无法撤销。')) removeDeck.mutate() }} disabled={removeDeck.isPending}><Trash2 size={17} /> 删除牌组</button>
            <div><button type="button" className="button button--ghost" onClick={() => setEditingDeck(false)}>取消</button><button className="button button--primary" disabled={saveDeck.isPending || !deckName.trim()}>保存设置</button></div>
          </div>
        </form>
      )}
      <section className="deck-cta-row">
        {dueCount > 0 ? (
          <Link className="button button--primary" to={`/study?deck=${deckId}`}><BookOpen size={18} /> 学习 {dueCount} 张</Link>
        ) : (
          <button type="button" className="button button--secondary" disabled>今日已学完</button>
        )}
        <Link className="button button--secondary" to={`/import?deck=${deckId}`}><FileUp size={18} /> 导入</Link>
        <button type="button" className="button button--secondary deck-export-button" onClick={() => downloadText(`${deck.data!.name.replace(/[\\/:*?"<>|]/g, '-')}.csv`, toCardsCsv(cards.data!), 'text/csv;charset=utf-8')}><Download size={18} /> 导出</button>
      </section>

      <section className="cards-section">
        <div className="cards-toolbar">
          <label className="search-field"><Search size={18} /><input value={queryText} onChange={(event) => setQueryText(event.target.value)} placeholder="搜索正面或背面" aria-label="搜索卡片" /></label>
          <button type="button" className="icon-button icon-button--filled" onClick={() => adding && !editingCardId ? setAdding(false) : startAdding()} aria-label="添加卡片"><Plus size={20} /></button>
        </div>
        {adding && (
          <form className="inline-form card-form" onSubmit={submit}>
            <FormField label="正面" error={formError}><TextArea value={front} onChange={(event) => setFront(event.target.value)} rows={3} maxLength={10000} autoFocus /></FormField>
            <FormField label="背面"><TextArea value={back} onChange={(event) => setBack(event.target.value)} rows={3} maxLength={10000} /></FormField>
            <div className="form-actions"><button type="button" className="button button--ghost" onClick={() => { setAdding(false); setEditingCardId(null) }}>取消</button><button className="button button--primary" disabled={saveCard.isPending}>{editingCardId ? '保存修改' : '保存卡片'}</button></div>
          </form>
        )}
        {cards.data!.length === 0 ? (
          <EmptyState title={queryText ? '没有找到卡片' : '这副牌组还是空的'} description={queryText ? '换一个关键词再试试。' : '手动添加第一张，或者从文件一次导入多张。'} action={!queryText && <button type="button" className="button button--primary" onClick={startAdding}>添加卡片</button>} />
        ) : (
          <div className="card-list">
            {cards.data!.map((card) => (
              <article className={`card-row${card.isSuspended ? ' card-row--suspended' : ''}`} key={card.id}>
                <div className="card-row__state" aria-label={card.state === 'new' ? '新卡' : '复习卡'} title={card.state === 'new' ? '新卡，还没学过' : `已复习 ${card.repetitions} 次`}>{card.state === 'new' ? '新' : card.repetitions}</div>
                <div className="card-row__copy"><strong>{card.front}</strong><span>{card.back || '背面为空'}</span></div>
                <div className="card-row__actions">
                  <button type="button" className="mini-icon" onClick={() => { setEditingCardId(card.id); setFront(card.front); setBack(card.back); setFormError(''); setAdding(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }} aria-label="编辑卡片"><Pencil size={17} /></button>
                  <button type="button" className="mini-icon" onClick={() => suspendCard.mutate({ id: card.id, value: !card.isSuspended })} aria-label={card.isSuspended ? '恢复卡片' : '暂停卡片'}>{card.isSuspended ? <Play size={17} /> : <Pause size={17} />}</button>
                  <button type="button" className="mini-icon mini-icon--danger" onClick={() => { if (window.confirm('删除这张卡片及其复习记录？此操作无法撤销。')) deleteCard.mutate(card.id) }} aria-label="删除卡片"><Trash2 size={17} /></button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
