import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, FileSpreadsheet, FileUp, RotateCcw } from 'lucide-react'
import { useMemo, useState, type ChangeEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { repository } from '../data/repository'
import { mapImportRows, parseDelimitedFile, type ParsedImport } from '../lib/csv'
import type { ImportJob } from '../types'
import { ErrorState, Loading } from '../components/Feedback'
import { PageHeader } from '../components/PageHeader'

export function ImportPage() {
  const [params] = useSearchParams()
  const initialDeck = params.get('deck') ?? ''
  const client = useQueryClient()
  const decks = useQuery({ queryKey: ['decks'], queryFn: () => repository.listDecks() })
  const [deckId, setDeckId] = useState(initialDeck)
  const [filename, setFilename] = useState('')
  const [parsed, setParsed] = useState<ParsedImport | null>(null)
  const [frontColumn, setFrontColumn] = useState(0)
  const [backColumn, setBackColumn] = useState(1)
  const [keepDuplicates, setKeepDuplicates] = useState(false)
  const [fileError, setFileError] = useState('')
  const [job, setJob] = useState<ImportJob | null>(null)
  const mappedRows = useMemo(() => parsed ? mapImportRows(parsed.rows, frontColumn, backColumn) : [], [parsed, frontColumn, backColumn])

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setFileError(''); setJob(null)
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setFileError('文件不能超过 5 MB'); return }
    const content = await file.text()
    const result = parseDelimitedFile(content)
    if (result.rows.length > 5000) { setFileError('单次最多导入 5,000 张卡片'); return }
    if (result.headers.length < 2) { setFileError('文件至少需要两列'); return }
    setFilename(file.name); setParsed(result); setFrontColumn(0); setBackColumn(1)
  }

  const importMutation = useMutation({
    mutationFn: () => repository.importCards(deckId, filename, mappedRows, keepDuplicates),
    onSuccess: async (result) => {
      setJob(result)
      await client.invalidateQueries({ queryKey: ['decks'] })
      await client.invalidateQueries({ queryKey: ['cards', deckId] })
      await client.invalidateQueries({ queryKey: ['today-summary'] })
    }
  })
  const revertMutation = useMutation({
    mutationFn: () => repository.revertImport(job!.id),
    onSuccess: async () => {
      setJob((value) => value ? { ...value, status: 'reverted' } : null)
      await client.invalidateQueries({ queryKey: ['decks'] })
      await client.invalidateQueries({ queryKey: ['cards', deckId] })
    }
  })

  if (decks.isLoading) return <Loading />
  if (decks.error) return <ErrorState message={decks.error.message} onRetry={() => void decks.refetch()} />

  return (
    <div className="page import-page">
      <PageHeader back eyebrow="批量添加" title="导入牌组" description="先检查字段和内容，再把卡片放进资料库。" />
      {job ? (
        <section className="import-result">
          <div className="study-complete__mark"><Check size={30} /></div>
          <p className="eyebrow">{job.status === 'reverted' ? '已撤销导入' : '导入完成'}</p>
          <h2>{job.status === 'reverted' ? `${job.importedRows} 张卡片已移除` : `${job.importedRows} 张卡片已加入牌组`}</h2>
          {job.skippedRows > 0 && <p>另外跳过了 {job.skippedRows} 行重复或无效内容。</p>}
          <div className="form-actions">
            {job.status !== 'reverted' && <button className="button button--secondary" onClick={() => revertMutation.mutate()} disabled={revertMutation.isPending}><RotateCcw size={17} /> 撤销整次导入</button>}
            <Link className="button button--primary" to={`/decks/${job.deckId}`}>查看牌组</Link>
          </div>
        </section>
      ) : (
        <>
          <section className="import-setup">
            <label className="form-field"><span className="form-field__label">目标牌组</span><select className="select" value={deckId} onChange={(event) => setDeckId(event.target.value)}><option value="">请选择牌组</option>{decks.data!.map((deck) => <option key={deck.id} value={deck.id}>{deck.name}</option>)}</select></label>
            <label className="file-drop">
              <input type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" onChange={chooseFile} />
              <FileUp size={26} /><strong>{filename || '选择 CSV 或 TSV 文件'}</strong><span>UTF-8，最大 5 MB，最多 5,000 张</span>
            </label>
            {fileError && <p className="inline-error" role="alert">{fileError}</p>}
          </section>
          {parsed && (
            <section className="import-preview">
              <div className="section-heading"><div><p className="eyebrow">字段映射</p><h2>确认正面和背面</h2></div><FileSpreadsheet size={22} /></div>
              <div className="mapping-grid">
                <label>正面<select className="select" value={frontColumn} onChange={(event) => setFrontColumn(Number(event.target.value))}>{parsed.headers.map((header, index) => <option key={`${header}-${index}`} value={index}>{header}</option>)}</select></label>
                <label>背面<select className="select" value={backColumn} onChange={(event) => setBackColumn(Number(event.target.value))}>{parsed.headers.map((header, index) => <option key={`${header}-${index}`} value={index}>{header}</option>)}</select></label>
              </div>
              <div className="preview-table" role="table" aria-label="导入预览">
                <div className="preview-table__head" role="row"><span>正面</span><span>背面</span></div>
                {mappedRows.slice(0, 8).map((row) => <div className="preview-table__row" role="row" key={row.sourceRow}><span>{row.front}</span><span>{row.back || '空白'}</span></div>)}
              </div>
              <label className="check-row"><input type="checkbox" checked={keepDuplicates} onChange={(event) => setKeepDuplicates(event.target.checked)} /><span><strong>保留重复卡片</strong><small>默认跳过正面和背面都相同的卡片</small></span></label>
              {parsed.errors.length > 0 && <p className="import-warning">检测到 {parsed.errors.length} 个格式问题，无效行不会导入。</p>}
              <button className="button button--primary button--large" disabled={!deckId || mappedRows.length === 0 || frontColumn === backColumn || importMutation.isPending} onClick={() => importMutation.mutate()}>{importMutation.isPending ? '正在导入' : `导入 ${mappedRows.length} 张卡片`}</button>
              {importMutation.error && <p className="inline-error" role="alert">{importMutation.error.message}</p>}
            </section>
          )}
        </>
      )}
    </div>
  )
}
