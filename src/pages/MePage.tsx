import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Cloud, Download, LogOut, RefreshCcw, ShieldCheck, Trash2, Wifi } from 'lucide-react'
import { useState } from 'react'
import { repository, repositoryMode } from '../data/repository'
import { downloadText } from '../lib/download'
import { useAuth } from '../contexts/AuthContext'
import { ErrorState, Loading } from '../components/Feedback'
import { PageHeader } from '../components/PageHeader'
import { Link } from 'react-router-dom'

export function MePage() {
  const auth = useAuth()
  const client = useQueryClient()
  const [accountError, setAccountError] = useState('')
  const profile = useQuery({ queryKey: ['profile'], queryFn: () => repository.getProfile() })
  const exportMutation = useMutation({
    mutationFn: () => repository.exportData(),
    onSuccess: (data) => downloadText(`moss-card-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ format: 'moss-card-backup', version: 1, exportedAt: new Date().toISOString(), ...data }, null, 2), 'application/json')
  })
  const resetMutation = useMutation({
    mutationFn: () => repository.resetDemoData(),
    onSuccess: async () => { await client.invalidateQueries() }
  })
  const deleteAccount = useMutation({
    mutationFn: () => auth.deleteAccount(),
    onError: (reason) => setAccountError(reason instanceof Error ? reason.message : '无法删除账号')
  })

  if (profile.isLoading) return <Loading />
  if (profile.error) return <ErrorState message={profile.error.message} onRetry={() => void profile.refetch()} />
  const data = profile.data!

  return (
    <div className="page me-page">
      <PageHeader eyebrow="账户与数据" title="我的" description="学习数据属于你，也应该随时能带走。" />
      <section className="profile-block">
        <div className="profile-monogram">{data.email.slice(0, 1).toUpperCase()}</div>
        <div><strong>{repositoryMode === 'demo' ? '本地体验档案' : data.email}</strong><span>{repositoryMode === 'demo' ? data.email : '邮箱验证码登录'}</span></div>
      </section>

      <section className="settings-group">
        <p className="eyebrow">学习默认值</p>
        <div className="setting-row"><div><strong>每日新卡</strong><span>每副牌组可以单独调整</span></div><b>{data.defaultNewCardsPerDay} 张</b></div>
        <div className="setting-row"><div><strong>目标记忆率</strong><span>越高，日常复习量越大</span></div><b>{Math.round(data.defaultRetention * 100)}%</b></div>
      </section>

      <section className="settings-group">
        <p className="eyebrow">同步与安全</p>
        <div className="setting-row"><div className="setting-icon"><Wifi size={20} /></div><div><strong>{navigator.onLine ? '网络已连接' : '当前离线'}</strong><span>{repositoryMode === 'cloud' ? '学习记录自动保存到云端' : '数据只保存在这台设备'}</span></div></div>
        <div className="setting-row"><div className="setting-icon"><Cloud size={20} /></div><div><strong>{repositoryMode === 'cloud' ? 'Supabase 云同步' : '尚未连接 Supabase'}</strong><span>{repositoryMode === 'cloud' ? '行级权限保护每位用户的数据' : '配置环境变量即可切换云端模式'}</span></div></div>
        <div className="setting-row"><div className="setting-icon"><ShieldCheck size={20} /></div><div><strong>完整备份</strong><span>包含牌组、卡片与复习历史</span></div><button type="button" className="mini-action" onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}><Download size={18} /> 导出</button></div>
      </section>

      {repositoryMode === 'demo' ? (
        <button type="button" className="button button--secondary danger-zone-button" onClick={() => { if (window.confirm('恢复为初始演示数据？你在本机添加的内容会被移除。')) resetMutation.mutate() }}><RefreshCcw size={18} /> 恢复演示数据</button>
      ) : (
        <section className="account-actions">
          <button type="button" className="button button--secondary" onClick={() => void auth.signOut()}><LogOut size={18} /> 退出登录</button>
          <button type="button" className="button button--ghost danger-zone-button" disabled={deleteAccount.isPending} onClick={() => { setAccountError(''); if (window.confirm('永久删除账号及全部牌组、卡片和复习记录？此操作无法撤销。')) deleteAccount.mutate() }}><Trash2 size={18} /> 永久删除账号</button>
          {accountError && <p className="inline-error" role="alert">{accountError}</p>}
        </section>
      )}
      <footer className="legal-links"><Link to="/privacy">隐私说明</Link><Link to="/terms">使用条款</Link><a href="https://github.com/holynova/flash-card" target="_blank" rel="noreferrer">GitHub</a></footer>
    </div>
  )
}
