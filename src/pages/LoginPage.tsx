import { useState, type FormEvent } from 'react'
import { Mail, MoveRight } from 'lucide-react'
import { Brand } from '../components/Brand'
import { FormField, TextInput } from '../components/FormField'
import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'

export function LoginPage() {
  const { signInWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('请输入有效的邮箱地址')
      return
    }
    setStatus('sending')
    try {
      await signInWithEmail(email)
      setStatus('sent')
    } catch (reason) {
      setStatus('idle')
      setError(reason instanceof Error ? reason.message : '无法发送登录邮件，请稍后重试')
    }
  }

  return (
    <main className="login-page" id="main-content">
      <section className="login-sheet">
        <Brand />
        <div className="login-copy">
          <p className="eyebrow">每天记住一点</p>
          <h1>把今天该学的，安静地学完。</h1>
          <p>苔卡根据你的记忆状态安排复习，不追求打卡数字，只关心你是否真的记住。</p>
        </div>
        {status === 'sent' ? (
          <div className="notice notice--success" role="status">
            <Mail size={20} />
            <div><strong>登录邮件已发送</strong><span>请在同一台设备上打开邮件中的链接。</span></div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <FormField label="邮箱" error={error}>
              <TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" />
            </FormField>
            <button className="button button--primary" disabled={status === 'sending'}>
              {status === 'sending' ? '正在发送' : '发送登录链接'} <MoveRight size={18} />
            </button>
          </form>
        )}
        <footer><Link to="/privacy">隐私</Link><Link to="/terms">使用条款</Link><a href="https://github.com/holynova/flash-card" target="_blank" rel="noreferrer">GitHub</a></footer>
      </section>
    </main>
  )
}
