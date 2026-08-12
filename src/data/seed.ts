import { addDays, subDays, subMinutes } from 'date-fns'
import { localDb, DEMO_USER_ID } from './local-db'
import type { Card, Deck, Profile } from '../types'

const profile: Profile = {
  id: DEMO_USER_ID,
  email: 'demo@moss-card.local',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai',
  defaultNewCardsPerDay: 10,
  defaultRetention: 0.9
}

const deckIds = {
  english: '10000000-0000-4000-8000-000000000001',
  history: '10000000-0000-4000-8000-000000000002'
}

const now = new Date()
const decks: Deck[] = [
  {
    id: deckIds.english,
    userId: DEMO_USER_ID,
    name: '旅行英语',
    description: '在路上真正会用到的表达',
    newCardsPerDay: 8,
    desiredRetention: 0.9,
    createdAt: subDays(now, 18).toISOString(),
    updatedAt: now.toISOString()
  },
  {
    id: deckIds.history,
    userId: DEMO_USER_ID,
    name: '中国历史节点',
    description: '用简短问答串起重要年代',
    newCardsPerDay: 5,
    desiredRetention: 0.92,
    createdAt: subDays(now, 9).toISOString(),
    updatedAt: now.toISOString()
  }
]

const sourceCards: Array<[string, string, string]> = [
  [deckIds.english, 'Could I have the bill, please?', '请给我账单，好吗？'],
  [deckIds.english, 'Where can I refill my water bottle?', '我在哪里可以给水瓶续水？'],
  [deckIds.english, 'Is breakfast included?', '包含早餐吗？'],
  [deckIds.english, 'I would like a window seat.', '我想要靠窗的座位。'],
  [deckIds.english, 'How long does the journey take?', '这段路程需要多长时间？'],
  [deckIds.english, 'Could you speak a little more slowly?', '你可以说慢一点吗？'],
  [deckIds.history, '秦统一六国发生在哪一年？', '公元前 221 年。'],
  [deckIds.history, '贞观之治主要对应哪位皇帝？', '唐太宗李世民。'],
  [deckIds.history, '北宋建立于哪一年？', '公元 960 年。'],
  [deckIds.history, '郑和第一次下西洋发生在哪一年？', '公元 1405 年。'],
  [deckIds.history, '辛亥革命爆发于哪一年？', '公元 1911 年。']
]

const cards: Card[] = sourceCards.map(([deckId, front, back], index) => {
  const reviewed = index < 6
  const createdAt = subDays(now, 16 - index).toISOString()
  return {
    id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    userId: DEMO_USER_ID,
    deckId,
    front,
    back,
    state: reviewed ? 'review' : 'new',
    dueAt: reviewed ? subMinutes(now, 25 + index).toISOString() : createdAt,
    stability: reviewed ? 3.2 + index : null,
    difficulty: reviewed ? 5.4 - index * 0.15 : null,
    scheduledDays: reviewed ? 3 : 0,
    elapsedDays: reviewed ? 3 : 0,
    repetitions: reviewed ? 3 : 0,
    lapses: index === 1 ? 1 : 0,
    lastReviewedAt: reviewed ? subDays(now, 3).toISOString() : null,
    isSuspended: false,
    version: reviewed ? 3 : 0,
    importJobId: null,
    createdAt,
    updatedAt: reviewed ? subDays(now, 3).toISOString() : createdAt
  }
})

export async function seedLocalData(): Promise<void> {
  if ((await localDb.profiles.count()) > 0) return
  await localDb.transaction('rw', localDb.profiles, localDb.decks, localDb.cards, async () => {
    await localDb.profiles.add(profile)
    await localDb.decks.bulkAdd(decks)
    await localDb.cards.bulkAdd(cards)
  })
}

export async function resetLocalData(): Promise<void> {
  await localDb.delete()
  await localDb.open()
  await seedLocalData()
}

export function nextWeekIso(days: number): string {
  return addDays(now, days).toISOString()
}
