import { localDb, DEMO_USER_ID } from './local-db'
import { resetLocalData, seedLocalData } from './seed'
import { createId } from '../lib/ids'
import { calculateStreak, reviewedToday } from '../lib/time'
import { scheduleCard } from '../lib/scheduler'
import type {
  Card,
  CreateCardInput,
  CreateDeckInput,
  DataRepository,
  Deck,
  DeckSummary,
  ImportJob,
  ImportRow,
  ReviewLog,
  SubmitReviewInput,
  TodaySummary
} from '../types'

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
}

export class LocalRepository implements DataRepository {
  private ready = seedLocalData()

  private async ensureReady(): Promise<void> {
    await this.ready
  }

  async getProfile() {
    await this.ensureReady()
    const profile = await localDb.profiles.get(DEMO_USER_ID)
    if (!profile) throw new Error('本地档案不存在')
    return profile
  }

  async listDecks(): Promise<DeckSummary[]> {
    await this.ensureReady()
    const decks = await localDb.decks.orderBy('createdAt').reverse().toArray()
    const cards = await localDb.cards.toArray()
    const logs = await localDb.reviewLogs.toArray()
    const now = Date.now()
    return decks.map((deck) => {
      const related = cards.filter((card) => card.deckId === deck.id && !card.isSuspended)
      return {
        ...deck,
        totalCards: related.length,
        dueCards: related.filter((card) => card.state !== 'new' && new Date(card.dueAt).getTime() <= now).length,
        newCards: related.filter((card) => card.state === 'new').length,
        completedToday: logs.filter((log) => log.deckId === deck.id && !log.undoneAt && reviewedToday(log.reviewedAt)).length
      }
    })
  }

  async getDeck(id: string): Promise<DeckSummary | null> {
    const decks = await this.listDecks()
    return decks.find((deck) => deck.id === id) ?? null
  }

  async createDeck(input: CreateDeckInput): Promise<Deck> {
    await this.ensureReady()
    const profile = await this.getProfile()
    const now = new Date().toISOString()
    const deck: Deck = {
      id: createId(),
      userId: DEMO_USER_ID,
      name: input.name.trim(),
      description: input.description?.trim() ?? '',
      newCardsPerDay: input.newCardsPerDay ?? profile.defaultNewCardsPerDay,
      desiredRetention: input.desiredRetention ?? profile.defaultRetention,
      createdAt: now,
      updatedAt: now
    }
    await localDb.decks.add(deck)
    return deck
  }

  async updateDeck(id: string, input: Partial<CreateDeckInput>): Promise<Deck> {
    await this.ensureReady()
    const existing = await localDb.decks.get(id)
    if (!existing) throw new Error('找不到牌组')
    const deck: Deck = {
      ...existing,
      name: input.name?.trim() ?? existing.name,
      description: input.description?.trim() ?? existing.description,
      newCardsPerDay: input.newCardsPerDay ?? existing.newCardsPerDay,
      desiredRetention: input.desiredRetention ?? existing.desiredRetention,
      updatedAt: new Date().toISOString()
    }
    await localDb.decks.put(deck)
    return deck
  }

  async deleteDeck(id: string): Promise<void> {
    await this.ensureReady()
    const cardIds = await localDb.cards.where('deckId').equals(id).primaryKeys()
    await localDb.transaction('rw', localDb.decks, localDb.cards, localDb.reviewLogs, localDb.importJobs, async () => {
      await localDb.reviewLogs.where('deckId').equals(id).delete()
      await localDb.importJobs.where('deckId').equals(id).delete()
      await localDb.cards.bulkDelete(cardIds)
      await localDb.decks.delete(id)
    })
  }

  async listCards(deckId?: string, query = ''): Promise<Card[]> {
    await this.ensureReady()
    let cards = deckId ? await localDb.cards.where('deckId').equals(deckId).toArray() : await localDb.cards.toArray()
    const needle = normalize(query)
    if (needle) cards = cards.filter((card) => normalize(`${card.front} ${card.back}`).includes(needle))
    return cards.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async getCard(id: string): Promise<Card | null> {
    await this.ensureReady()
    return (await localDb.cards.get(id)) ?? null
  }

  async createCard(input: CreateCardInput): Promise<Card> {
    await this.ensureReady()
    const now = new Date().toISOString()
    const card: Card = {
      id: createId(),
      userId: DEMO_USER_ID,
      deckId: input.deckId,
      front: input.front.trim(),
      back: input.back.trim(),
      state: 'new',
      dueAt: now,
      stability: null,
      difficulty: null,
      scheduledDays: 0,
      elapsedDays: 0,
      repetitions: 0,
      lapses: 0,
      lastReviewedAt: null,
      isSuspended: false,
      version: 0,
      importJobId: input.importJobId ?? null,
      createdAt: now,
      updatedAt: now
    }
    await localDb.cards.add(card)
    return card
  }

  async updateCard(id: string, input: Pick<CreateCardInput, 'front' | 'back'>): Promise<Card> {
    const card = await this.getCard(id)
    if (!card) throw new Error('找不到卡片')
    const updated = { ...card, front: input.front.trim(), back: input.back.trim(), updatedAt: new Date().toISOString() }
    await localDb.cards.put(updated)
    return updated
  }

  async setCardSuspended(id: string, suspended: boolean): Promise<Card> {
    const card = await this.getCard(id)
    if (!card) throw new Error('找不到卡片')
    const updated = { ...card, isSuspended: suspended, updatedAt: new Date().toISOString() }
    await localDb.cards.put(updated)
    return updated
  }

  async deleteCard(id: string): Promise<void> {
    await this.ensureReady()
    await localDb.transaction('rw', localDb.cards, localDb.reviewLogs, async () => {
      await localDb.reviewLogs.where('cardId').equals(id).delete()
      await localDb.cards.delete(id)
    })
  }

  async getTodaySummary(): Promise<TodaySummary> {
    const decks = await this.listDecks()
    const logs = (await localDb.reviewLogs.toArray()).filter((log) => !log.undoneAt)
    const due = decks.reduce((sum, deck) => sum + deck.dueCards, 0)
    const fresh = decks.reduce((sum, deck) => sum + Math.min(deck.newCards, deck.newCardsPerDay), 0)
    const completed = logs.filter((log) => reviewedToday(log.reviewedAt)).length
    return {
      due,
      fresh,
      completed,
      estimatedMinutes: Math.max(1, Math.ceil((due + fresh) * 0.22)),
      streak: calculateStreak(logs.map((log) => log.reviewedAt))
    }
  }

  async getStudyQueue(deckId?: string): Promise<Card[]> {
    await this.ensureReady()
    const decks = (await this.listDecks()).filter((deck) => !deckId || deck.id === deckId)
    const allCards = await this.listCards(deckId)
    const now = Date.now()
    const due = allCards
      .filter((card) => !card.isSuspended && card.state !== 'new' && new Date(card.dueAt).getTime() <= now)
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    const fresh = decks.flatMap((deck) =>
      allCards
        .filter((card) => card.deckId === deck.id && card.state === 'new' && !card.isSuspended)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .slice(0, deck.newCardsPerDay)
    )
    return [...due, ...fresh]
  }

  async submitReview(input: SubmitReviewInput): Promise<ReviewLog> {
    await this.ensureReady()
    const existing = await localDb.reviewLogs.get(input.eventId)
    if (existing) return existing
    const card = await localDb.cards.get(input.cardId)
    if (!card) throw new Error('找不到卡片')
    if (card.version !== input.expectedVersion) throw new Error('卡片已在其他设备更新，请刷新学习队列')
    const deck = await localDb.decks.get(card.deckId)
    const resultingCard = scheduleCard(card, input.rating, input.reviewedAt, deck?.desiredRetention ?? 0.9)
    const log: ReviewLog = {
      id: input.eventId,
      userId: DEMO_USER_ID,
      cardId: card.id,
      deckId: card.deckId,
      rating: input.rating,
      reviewedAt: input.reviewedAt,
      durationMs: input.durationMs,
      previousCard: card,
      resultingCard,
      undoneAt: null
    }
    await localDb.transaction('rw', localDb.cards, localDb.reviewLogs, async () => {
      await localDb.reviewLogs.add(log)
      await localDb.cards.put(resultingCard)
    })
    return log
  }

  async undoLastReview(): Promise<Card | null> {
    await this.ensureReady()
    const logs = await localDb.reviewLogs.orderBy('reviewedAt').reverse().toArray()
    const log = logs.find((item) => !item.undoneAt)
    if (!log) return null
    const restored = { ...log.previousCard, updatedAt: new Date().toISOString() }
    await localDb.transaction('rw', localDb.cards, localDb.reviewLogs, async () => {
      await localDb.cards.put(restored)
      await localDb.reviewLogs.update(log.id, { undoneAt: new Date().toISOString() })
    })
    return restored
  }

  async importCards(deckId: string, filename: string, rows: ImportRow[], keepDuplicates: boolean): Promise<ImportJob> {
    await this.ensureReady()
    const id = createId()
    const existing = new Set((await this.listCards(deckId)).map((card) => `${normalize(card.front)}\u0000${normalize(card.back)}`))
    const accepted = rows.filter((row) => {
      const key = `${normalize(row.front)}\u0000${normalize(row.back)}`
      if (!keepDuplicates && existing.has(key)) return false
      existing.add(key)
      return true
    })
    const now = new Date().toISOString()
    const cards: Card[] = accepted.map((row) => ({
      id: createId(),
      userId: DEMO_USER_ID,
      deckId,
      front: row.front,
      back: row.back,
      state: 'new',
      dueAt: now,
      stability: null,
      difficulty: null,
      scheduledDays: 0,
      elapsedDays: 0,
      repetitions: 0,
      lapses: 0,
      lastReviewedAt: null,
      isSuspended: false,
      version: 0,
      importJobId: id,
      createdAt: now,
      updatedAt: now
    }))
    const job: ImportJob = {
      id,
      userId: DEMO_USER_ID,
      deckId,
      filename,
      status: 'complete',
      totalRows: rows.length,
      importedRows: cards.length,
      skippedRows: rows.length - cards.length,
      errorSummary: null,
      createdAt: now
    }
    await localDb.transaction('rw', localDb.cards, localDb.importJobs, async () => {
      await localDb.importJobs.add(job)
      if (cards.length) await localDb.cards.bulkAdd(cards)
    })
    return job
  }

  async revertImport(jobId: string): Promise<void> {
    await this.ensureReady()
    await localDb.transaction('rw', localDb.cards, localDb.importJobs, async () => {
      await localDb.cards.where('importJobId').equals(jobId).delete()
      await localDb.importJobs.update(jobId, { status: 'reverted' })
    })
  }

  async exportData() {
    await this.ensureReady()
    return {
      profile: await this.getProfile(),
      decks: await localDb.decks.toArray(),
      cards: await localDb.cards.toArray(),
      reviewLogs: await localDb.reviewLogs.toArray()
    }
  }

  async resetDemoData(): Promise<void> {
    await resetLocalData()
    this.ready = Promise.resolve()
  }
}
