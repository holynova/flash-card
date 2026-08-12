import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, FileUp, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { repository } from '../data/repository'
import { EmptyState, ErrorState, Loading } from '../components/Feedback'
import { FormField, TextArea, TextInput } from '../components/FormField'
import { PageHeader } from '../components/PageHeader'

export function DecksPage() {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['decks'], queryFn: () => repository.listDecks() })
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const mutation = useMutation({
    mutationFn: () => repository.createDeck({ name, description }),
    onSuccess: async () => {
      setName(''); setDescription(''); setCreating(false)
      await client.invalidateQueries({ queryKey: ['decks'] })
      await client.invalidateQueries({ queryKey: ['today-summary'] })
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : '无法创建牌组')
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!name.trim()) { setError('请输入牌组名称'); return }
    mutation.mutate()
  }

  return (
    <div className="page decks-page">
      <PageHeader eyebrow="资料库" title="牌组" description="把内容分开管理，把今天合在一起学习。" action={<button type="button" className="icon-button icon-button--filled" onClick={() => setCreating((value) => !value)} aria-label="新建牌组"><Plus size={21} /></button>} />
      {creating && (
        <form className="inline-form" onSubmit={submit}>
          <FormField label="牌组名称" error={error}><TextInput value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoFocus /></FormField>
          <FormField label="一句说明"><TextArea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={240} rows={2} /></FormField>
          <div className="form-actions"><button type="button" className="button button--ghost" onClick={() => setCreating(false)}>取消</button><button className="button button--primary" disabled={mutation.isPending}>创建牌组</button></div>
        </form>
      )}
      {query.isLoading ? <Loading /> : query.error ? <ErrorState message={query.error.message} onRetry={() => void query.refetch()} /> : query.data!.length === 0 ? (
        <EmptyState title="先建立第一副牌组" description="你可以手动添加卡片，也可以从 CSV 或 TSV 文件导入。" action={<button type="button" className="button button--primary" onClick={() => setCreating(true)}>新建牌组</button>} />
      ) : (
        <div className="deck-stack">
          {query.data!.map((deck, index) => (
            <Link to={`/decks/${deck.id}`} className="deck-sheet" key={deck.id}>
              <div className="deck-sheet__number">{String(index + 1).padStart(2, '0')}</div>
              <div className="deck-sheet__copy"><h2>{deck.name}</h2><p>{deck.description || '还没有添加说明'}</p><div><span>{deck.totalCards} 张卡片</span><span>{deck.dueCards + Math.min(deck.newCards, deck.newCardsPerDay)} 张待学</span></div></div>
              <ArrowRight size={20} />
            </Link>
          ))}
        </div>
      )}
      <Link className="import-shortcut" to="/import"><FileUp size={20} /><div><strong>从文件导入</strong><span>支持 CSV 和 TSV，导入前可以预览</span></div><ArrowRight size={18} /></Link>
    </div>
  )
}
