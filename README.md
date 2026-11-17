<p align="center">
  <img src="./assets/readme/hero.svg" width="100%" alt="苔卡 Moss Card — 移动端 FSRS 间隔重复闪卡 PWA：每天几分钟，记住该记住的">
</p>

<p align="center">
  <a href="https://xiaosang.cc/flash-card/">▶ 在线使用 Try Online</a>
  ·
  <a href="https://github.com/holynova/flash-card">GitHub 仓库</a>
</p>

苔卡是一款移动端优先的间隔重复闪卡 PWA：用 FSRS 算法排复习计划，今天该复习几张、新学几张，打开首页就知道。本地优先，离线可用；接上 Supabase 后自动开启云同步。零游戏化，没有积分和奖杯，只有一本每天都会打开的学习册。

Moss Card is a mobile-first spaced-repetition flashcard PWA powered by the FSRS algorithm: open it and today's queue — reviews due and new cards — is right there. Local-first and offline-capable; connect Supabase to enable cloud sync. No points, no trophies, just a study book you open every day.

## 截图 / Screenshots

<p align="center">
  <img src="./assets/readme/screenshot-today.png" width="300" alt="今日页：今日安排还有 11 张，6 张待复习、5 张新卡、预计 3 分钟；下方是旅行英语与中国历史节点两个牌组">
</p>

## 功能 / Features

- **FSRS 复习计划**：每次复习按「重来 / 困难 / 良好 / 简单」四档打分，算法据此算出下次复习时间；默认每天 10 张新卡、目标保持率 90%。
- **今日页**：待复习、新卡、已完成一目了然，点一下就开始今天的学习。
- **牌组管理**：自建牌组、逐张加卡、每牌组可单独设每日新卡数与保持率。
- **批量导入**：CSV / TSV 文件导入，UTF-8、最大 5 MB、单次最多 5,000 张；导入前可预览核对，整次导入可一键撤销。
- **本地优先**：数据存在本地 IndexedDB，断网也能学；不接 Supabase 时就是本地演示模式，同步状态始终可见。
- **云同步（可选）**：接上 Supabase 后登录账号，牌组与复习记录自动同步；含删除账号的 Edge Function。
- **PWA**：可安装到主屏幕，离线打开；隐私政策与服务条款页内置。

内置两个示例牌组（共 10 张卡）：「旅行英语」（5 张）与「中国历史节点」（5 张），打开就能试学。

## 本地运行 / Run Locally

```bash
pnpm install
pnpm dev        # 开发服务器
pnpm build      # 类型检查 + 构建
pnpm test       # Vitest 单元测试
pnpm e2e        # Playwright 端到端测试
```

本地演示模式无需任何配置，直接打开即可试用；要启用云同步，复制 `.env.example` 填入 Supabase 地址与匿名密钥。

## 技术 / Tech

- React 19 + TypeScript + Vite，React Router 7，移动端优先（375px 起，桌面左侧窄栏导航）。
- 间隔重复：`ts-fsrs`（FSRS 算法）；本地存储：Dexie（IndexedDB）；云同步：Supabase（含 Auth 与 Edge Functions）。
- PWA：vite-plugin-pwa + Workbox，离线可用；CSV 解析：PapaParse；表单校验：Zod。
- 设计基线见 `DESIGN.md`：晨光纸墨——暖象牙底、苔藓绿主色、楷体标题；触控目标不小于 44px。

```
src/App.tsx            路由：今日 / 牌组 / 学习 / 导入 / 我的 / 登录
src/pages/             各页面：TodayPage、StudyPage、DeckDetailPage、ImportPage 等
src/lib/scheduler.ts   FSRS 调度：四档评分 → 下次复习时间
src/data/              本地仓库（Dexie）与 Supabase 仓库 + 种子数据
supabase/functions/    Edge Functions：submit-review、delete-account
public/                PWA 清单、图标、示例截图
docs/                  构建产物（GitHub Pages 发布目录）
```

## English

**Moss Card** is a mobile-first spaced-repetition flashcard PWA. The FSRS algorithm schedules reviews: after each card you grade yourself Again / Hard / Good / Easy, and the next review date is computed from that. Defaults: 10 new cards per day, 90% desired retention.

- **Today page**: reviews due, new cards, and completed count at a glance; one tap starts the session.
- **Decks**: create decks and cards, with per-deck daily new-card limits and retention targets.
- **Bulk import**: CSV/TSV files (UTF-8, up to 5 MB, max 5,000 cards per import), with a preview step and one-click revert of the whole import.
- **Local-first**: data lives in IndexedDB and works offline; without Supabase it runs in local demo mode, and sync status is always visible.
- **Cloud sync (optional)**: connect Supabase to sync decks and review history across devices; includes an account-deletion Edge Function.
- **PWA**: installable, works offline; privacy policy and terms pages included.
- **Try it now**: two built-in demo decks (10 cards total) — "Travel English" (5) and "Chinese History Milestones" (5).
- **Run it**: `pnpm install && pnpm dev`. No config needed for local demo mode; copy `.env.example` to enable Supabase sync.
- **Tech**: React 19 + TypeScript + Vite, `ts-fsrs` for scheduling, Dexie (IndexedDB) locally, Supabase for sync, vite-plugin-pwa + Workbox for offline support.

## 许可 / License

MIT（见 `package.json`）。
