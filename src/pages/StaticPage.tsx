import { Link } from 'react-router-dom'
import { Brand } from '../components/Brand'

const content = {
  privacy: {
    title: '隐私说明',
    intro: '苔卡只收集提供闪卡学习和同步所必需的数据。',
    sections: [
      ['我们保存什么', '账号邮箱、牌组、卡片、复习记录、学习设置和必要的错误日志。'],
      ['数据如何使用', '这些数据仅用于登录、跨设备同步、安排复习和展示学习进度。'],
      ['本地模式', '未开启云同步时，数据只保存在当前浏览器中，不会上传。'],
      ['你的选择', '你可以随时导出完整 JSON 备份，也可以在云端模式的“我的”页面永久删除账号。']
    ]
  },
  terms: {
    title: '使用条款',
    intro: '苔卡目前是早期版本，请在重要学习资料上保留定期备份。',
    sections: [
      ['使用范围', '你可以创建、导入和学习自己有权使用的内容。'],
      ['内容责任', '请不要上传侵犯版权、隐私或其他合法权益的材料。'],
      ['服务可用性', '离线缓存可以降低短暂网络中断的影响，但不保证所有设备间永远无冲突。'],
      ['数据恢复', '删除前请导出备份。演示模式的数据会因清理浏览器数据而消失。']
    ]
  }
} as const

export function StaticPage({ type }: { type: keyof typeof content }) {
  const page = content[type]
  return (
    <main className="static-page" id="main-content">
      <div className="static-page__top"><Brand /><div className="static-page__links"><a href="https://github.com/holynova/flash-card" target="_blank" rel="noreferrer">GitHub</a><Link to="/">返回应用</Link></div></div>
      <article><p className="eyebrow">苔卡 Moss Card</p><h1>{page.title}</h1><p className="static-intro">{page.intro}</p>{page.sections.map(([title, body]) => <section key={title}><h2>{title}</h2><p>{body}</p></section>)}</article>
    </main>
  )
}
