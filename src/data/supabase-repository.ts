import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { scheduleCard } from '../lib/scheduler'
import { calculateStreak, reviewedToday } from '../lib/time'
import { localDb, type PendingReview } from './local-db'
import type {
  Card,
  CreateCardInput,
  CreateDeckInput,
  DataRepository,
  Deck,
  DeckSummary,
  ImportJob,
  ImportRow,
  Profile,
  ReviewLog,
  SubmitReviewInput,
  TodaySummary
} from '../types'

type Row = Record<string, unknown>

function requireClient() {
  if (!supabase) throw new Error('Supabase 尚未配置')
  return supabase
}

function asString(value: unknown): string {
  return String(value ?? '')
}

function mapDeck(row: Row): Deck {
  return {
    id: asString(row.id),
    userId: asString(row.user_id),
    name: asString(row.name),
    description: asString(row.description),
    newCardsPerDay: Number(row.new_cards_per_day),
    desiredRetention: Number(row.desired_retention),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at)
  }
}

function mapCard(row: Row): Card {
  return {
    id: asString(row.id),
    userId: asString(row.user_id),
    deckId: asString(row.deck_id),
    front: asString(row.front),
    back: asString(row.back),
    state: asString(row.state) as Card['state'],
    dueAt: asString(row.due_at),
    stability: row.stability === null ? null : Number(row.stability),
    difficulty: row.difficulty === null ? null : Number(row.difficulty),
    scheduledDays: Number(row.scheduled_days),
    elapsedDays: Number(row.elapsed_days),
    repetitions: Number(row.repetitions),
    lapses: Number(row.lapses),
    lastReviewedAt: row.last_reviewed_at ? asString(row.last_reviewed_at) : null,
    isSuspended: Boolean(row.is_suspended),
    version: Number(row.version),
    importJobId: row.import_job_id ? asString(row.import_job_id) : null,
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at)
  }
}

function mapReviewLog(row: Row): ReviewLog {
  return {
    id: asString(row.id),
    userId: asString(row.user_id),
    cardId: asString(row.card_id),
    deckId: asString(row.deck_id),
    rating: Number(row.rating) as ReviewLog['rating'],
    reviewedAt: asString(row.reviewed_at),
    durationMs: Number(row.duration_ms),
    previousCard: mapCard(row.previous_card as Row),
    resultingCard: mapCard(row.resulting_card as Row),
    undoneAt: row.undone_at ? asString(row.undone_at) : null
  }
}

function mapImportJob(row: Row): ImportJob {
  return {
    id: asString(row.id),
    userId: asString(row.user_id),
    deckId: asString(row.deck_id),
    filename: asString(row.filename),
    status: asString(row.status) as ImportJob['status'],
    totalRows: Number(row.total_rows),
    importedRows: Number(row.imported_rows),
    skippedRows: Number(row.skipped_rows),
    errorSummary: row.error_summary ? asString(row.error_summary) : null,
    createdAt: asString(row.created_at)
  }
}

async function currentUser(): Promise<User> {
  if (!navigator.onLine) {
    const { data } = await requireClient().auth.getSession()
    if (data.session?.user) return data.session.user
  }
  const { data, error } = await requireClient().auth.getUser()
  if (error || !data.user) throw new Error('登录已失效，请重新登录')
  return data.user
}

export class SupabaseRepository implements DataRepository {
  private flushPromise: Promise<void> | null = null

  private requestFlush(): void {
    if (this.flushPromise) return
    this.flushPromise = this.flushPendingReviews().finally(() => {
      this.flushPromise = null
    })
  }

  private async flushPendingReviews(): Promise<void> {
    if (!navigator.onLine) return
    const user = await currentUser()
    const pending = await localDb.pendingReviews.where('userId').equals(user.id).sortBy('createdAt')
    for (const item of pending) {
      const { data, error } = await requireClient().functions.invoke('submit-review', { body: item.input })
      if (error) break
      const payload = data as { review: Row }
      const log = mapReviewLog(payload.review)
      await localDb.transaction('rw', localDb.pendingReviews, localDb.cards, async () => {
        await localDb.pendingReviews.delete(item.id)
        await localDb.cards.put(log.resultingCard)
      })
    }
  }

  async getProfile(): Promise<Profile> {
    const user = await currentUser()
    if (!navigator.onLine) {
      const cached = await localDb.profiles.get(user.id)
      if (cached) return cached
      throw new Error('当前离线，尚未缓存个人资料')
    }
    this.requestFlush()
    const { data, error } = await requireClient().from('profiles').select('*').eq('id', user.id).single()
    if (error) throw error
    const profile = {
      id: user.id,
      email: user.email ?? '',
      timezone: data.timezone,
      defaultNewCardsPerDay: data.default_new_cards_per_day,
      defaultRetention: data.default_retention
    }
    await localDb.profiles.put(profile)
    return profile
  }

  async listDecks(): Promise<DeckSummary[]> {
    if (!navigator.onLine) {
      const user = await currentUser()
      const [decks, cards, pending] = await Promise.all([
        localDb.decks.where('userId').equals(user.id).toArray(),
        localDb.cards.where('userId').equals(user.id).toArray(),
        localDb.pendingReviews.where('userId').equals(user.id).toArray()
      ])
      const now = Date.now()
      return decks.map((deck) => {
        const related = cards.filter((card) => card.deckId === deck.id && !card.isSuspended)
        return {
          ...deck,
          totalCards: related.length,
          dueCards: related.filter((card) => card.state !== 'new' && new Date(card.dueAt).getTime() <= now).length,
          newCards: related.filter((card) => card.state === 'new').length,
          completedToday: pending.filter((review) => review.resultingCard.deckId === deck.id && reviewedToday(review.createdAt)).length
        }
      })
    }
    this.requestFlush()
    const { data, error } = await requireClient().from('decks').select('*').order('created_at', { ascending: false })
    if (error) throw error
    const cards = await this.listCards()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { data: logs, error: logsError } = await requireClient()
      .from('review_logs')
      .select('deck_id, reviewed_at, undone_at')
      .gte('reviewed_at', today.toISOString())
    if (logsError) throw logsError
    const now = Date.now()
    const mappedDecks = (data as Row[]).map(mapDeck)
    await localDb.decks.bulkPut(mappedDecks)
    return mappedDecks.map((deck) => {
      const related = cards.filter((card) => card.deckId === deck.id && !card.isSuspended)
      return {
        ...deck,
        totalCards: related.length,
        dueCards: related.filter((card) => card.state !== 'new' && new Date(card.dueAt).getTime() <= now).length,
        newCards: related.filter((card) => card.state === 'new').length,
        completedToday: (logs as Row[]).filter((log) => log.deck_id === deck.id && !log.undone_at).length
      }
    })
  }

  async getDeck(id: string): Promise<DeckSummary | null> {
    return (await this.listDecks()).find((deck) => deck.id === id) ?? null
  }

  async createDeck(input: CreateDeckInput): Promise<Deck> {
    const user = await currentUser()
    const profile = await this.getProfile()
    const { data, error } = await requireClient().from('decks').insert({
      user_id: user.id,
      name: input.name.trim(),
      description: input.description?.trim() ?? '',
      new_cards_per_day: input.newCardsPerDay ?? profile.defaultNewCardsPerDay,
      desired_retention: input.desiredRetention ?? profile.defaultRetention
    }).select().single()
    if (error) throw error
    return mapDeck(data)
  }

  async updateDeck(id: string, input: Partial<CreateDeckInput>): Promise<Deck> {
    const values: Row = {}
    if (input.name !== undefined) values.name = input.name.trim()
    if (input.description !== undefined) values.description = input.description.trim()
    if (input.newCardsPerDay !== undefined) values.new_cards_per_day = input.newCardsPerDay
    if (input.desiredRetention !== undefined) values.desired_retention = input.desiredRetention
    const { data, error } = await requireClient().from('decks').update(values).eq('id', id).select().single()
    if (error) throw error
    return mapDeck(data)
  }

  async deleteDeck(id: string): Promise<void> {
    const { error } = await requireClient().from('decks').delete().eq('id', id)
    if (error) throw error
  }

  async listCards(deckId?: string, query = ''): Promise<Card[]> {
    if (!navigator.onLine) {
      const user = await currentUser()
      const cached = deckId
        ? (await localDb.cards.where('deckId').equals(deckId).toArray()).filter((card) => card.userId === user.id)
        : await localDb.cards.where('userId').equals(user.id).toArray()
      const needle = query.trim().toLocaleLowerCase()
      return needle ? cached.filter((card) => `${card.front} ${card.back}`.toLocaleLowerCase().includes(needle)) : cached
    }
    let request = requireClient().from('cards').select('*').order('created_at', { ascending: false })
    if (deckId) request = request.eq('deck_id', deckId)
    const { data, error } = await request
    if (error) throw error
    const needle = query.trim().toLocaleLowerCase()
    const cards = (data as Row[]).map(mapCard).filter((card) => !needle || `${card.front} ${card.back}`.toLocaleLowerCase().includes(needle))
    await localDb.cards.bulkPut(cards)
    return cards
  }

  async getCard(id: string): Promise<Card | null> {
    if (!navigator.onLine) return (await localDb.cards.get(id)) ?? null
    const { data, error } = await requireClient().from('cards').select('*').eq('id', id).maybeSingle()
    if (error) {
      const cached = await localDb.cards.get(id)
      if (cached) return cached
      throw error
    }
    const card = data ? mapCard(data) : null
    if (card) await localDb.cards.put(card)
    return card
  }

  async createCard(input: CreateCardInput): Promise<Card> {
    const user = await currentUser()
    const { data, error } = await requireClient().from('cards').insert({
      user_id: user.id,
      deck_id: input.deckId,
      front: input.front.trim(),
      back: input.back.trim(),
      import_job_id: input.importJobId ?? null
    }).select().single()
    if (error) throw error
    return mapCard(data)
  }

  async updateCard(id: string, input: Pick<CreateCardInput, 'front' | 'back'>): Promise<Card> {
    const { data, error } = await requireClient().from('cards').update({ front: input.front.trim(), back: input.back.trim() }).eq('id', id).select().single()
    if (error) throw error
    return mapCard(data)
  }

  async setCardSuspended(id: string, suspended: boolean): Promise<Card> {
    const { data, error } = await requireClient().from('cards').update({ is_suspended: suspended }).eq('id', id).select().single()
    if (error) throw error
    return mapCard(data)
  }

  async deleteCard(id: string): Promise<void> {
    const { error } = await requireClient().from('cards').delete().eq('id', id)
    if (error) throw error
  }

  async getTodaySummary(): Promise<TodaySummary> {
    const decks = await this.listDecks()
    if (!navigator.onLine) {
      const user = await currentUser()
      const pending = await localDb.pendingReviews.where('userId').equals(user.id).toArray()
      const due = decks.reduce((sum, deck) => sum + deck.dueCards, 0)
      const fresh = decks.reduce((sum, deck) => sum + Math.min(deck.newCards, deck.newCardsPerDay), 0)
      return {
        due,
        fresh,
        completed: pending.filter((review) => reviewedToday(review.createdAt)).length,
        estimatedMinutes: Math.max(1, Math.ceil((due + fresh) * 0.22)),
        streak: calculateStreak(pending.map((review) => review.createdAt))
      }
    }
    const { data, error } = await requireClient().from('review_logs').select('reviewed_at, undone_at').is('undone_at', null)
    if (error) throw error
    const logs = data as Array<{ reviewed_at: string; undone_at: string | null }>
    const due = decks.reduce((sum, deck) => sum + deck.dueCards, 0)
    const fresh = decks.reduce((sum, deck) => sum + Math.min(deck.newCards, deck.newCardsPerDay), 0)
    return {
      due,
      fresh,
      completed: logs.filter((log) => reviewedToday(log.reviewed_at)).length,
      estimatedMinutes: Math.max(1, Math.ceil((due + fresh) * 0.22)),
      streak: calculateStreak(logs.map((log) => log.reviewed_at))
    }
  }

  async getStudyQueue(deckId?: string): Promise<Card[]> {
    const decks = (await this.listDecks()).filter((deck) => !deckId || deck.id === deckId)
    const cards = await this.listCards(deckId)
    const now = Date.now()
    const due = cards.filter((card) => !card.isSuspended && card.state !== 'new' && new Date(card.dueAt).getTime() <= now)
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    const fresh = decks.flatMap((deck) => cards.filter((card) => card.deckId === deck.id && card.state === 'new' && !card.isSuspended).slice(0, deck.newCardsPerDay))
    return [...due, ...fresh]
  }

  async submitReview(input: SubmitReviewInput): Promise<ReviewLog> {
    const card = navigator.onLine ? await this.getCard(input.cardId) : (await localDb.cards.get(input.cardId)) ?? null
    if (!card) throw new Error('找不到卡片')
    const deck = navigator.onLine ? await this.getDeck(card.deckId) : (await localDb.decks.get(card.deckId)) ?? null
    const resultingCard = scheduleCard(card, input.rating, input.reviewedAt, deck?.desiredRetention ?? 0.9)
    const user = await currentUser()
    const fallbackLog: ReviewLog = {
      id: input.eventId,
      userId: user.id,
      cardId: card.id,
      deckId: card.deckId,
      rating: input.rating,
      reviewedAt: input.reviewedAt,
      durationMs: input.durationMs,
      previousCard: card,
      resultingCard,
      undoneAt: null
    }
    if (!navigator.onLine) {
      const pending: PendingReview = { id: input.eventId, userId: user.id, input, createdAt: input.reviewedAt, previousCard: card, resultingCard }
      await localDb.transaction('rw', localDb.pendingReviews, localDb.cards, async () => {
        await localDb.pendingReviews.put(pending)
        await localDb.cards.put(resultingCard)
      })
      return fallbackLog
    }
    const { data, error } = await requireClient().functions.invoke('submit-review', { body: input })
    if (error) {
      const pending: PendingReview = { id: input.eventId, userId: user.id, input, createdAt: input.reviewedAt, previousCard: card, resultingCard }
      await localDb.transaction('rw', localDb.pendingReviews, localDb.cards, async () => {
        await localDb.pendingReviews.put(pending)
        await localDb.cards.put(resultingCard)
      })
      return fallbackLog
    }
    const payload = data as { review: Row }
    const log = mapReviewLog(payload.review)
    await localDb.cards.put(log.resultingCard)
    return log
  }

  async undoLastReview(): Promise<Card | null> {
    const user = await currentUser()
    const pending = await localDb.pendingReviews.where('userId').equals(user.id).sortBy('createdAt')
    const latestPending = pending.at(-1)
    if (latestPending) {
      await localDb.transaction('rw', localDb.pendingReviews, localDb.cards, async () => {
        await localDb.pendingReviews.delete(latestPending.id)
        await localDb.cards.put(latestPending.previousCard)
      })
      return latestPending.previousCard
    }
    const { data, error } = await requireClient().rpc('undo_last_review')
    if (error) throw error
    const card = data ? mapCard(data as Row) : null
    if (card) await localDb.cards.put(card)
    return card
  }

  async importCards(deckId: string, filename: string, rows: ImportRow[], keepDuplicates: boolean): Promise<ImportJob> {
    const user = await currentUser()
    const existing = new Set((await this.listCards(deckId)).map((card) => `${card.front.trim().toLowerCase()}\u0000${card.back.trim().toLowerCase()}`))
    const accepted = rows.filter((row) => {
      const key = `${row.front.trim().toLowerCase()}\u0000${row.back.trim().toLowerCase()}`
      if (!keepDuplicates && existing.has(key)) return false
      existing.add(key)
      return true
    })
    const { data: jobData, error: jobError } = await requireClient().from('import_jobs').insert({
      user_id: user.id,
      deck_id: deckId,
      filename,
      status: 'processing',
      total_rows: rows.length,
      imported_rows: 0,
      skipped_rows: rows.length - accepted.length
    }).select().single()
    if (jobError) throw jobError
    const job = mapImportJob(jobData)
    for (let index = 0; index < accepted.length; index += 250) {
      const chunk = accepted.slice(index, index + 250).map((row) => ({
        user_id: user.id,
        deck_id: deckId,
        front: row.front,
        back: row.back,
        import_job_id: job.id
      }))
      const { error } = await requireClient().from('cards').insert(chunk)
      if (error) {
        await requireClient().from('import_jobs').update({ status: 'failed', error_summary: error.message }).eq('id', job.id)
        throw error
      }
    }
    const { data, error } = await requireClient().from('import_jobs').update({ status: 'complete', imported_rows: accepted.length }).eq('id', job.id).select().single()
    if (error) throw error
    return mapImportJob(data)
  }

  async revertImport(jobId: string): Promise<void> {
    const client = requireClient()
    const { error: cardError } = await client.from('cards').delete().eq('import_job_id', jobId)
    if (cardError) throw cardError
    const { error } = await client.from('import_jobs').update({ status: 'reverted' }).eq('id', jobId)
    if (error) throw error
  }

  async exportData() {
    const profile = await this.getProfile()
    const decks = (await this.listDecks()).map(({ totalCards: _a, dueCards: _b, newCards: _c, completedToday: _d, ...deck }) => deck)
    const cards = await this.listCards()
    const { data, error } = await requireClient().from('review_logs').select('*').order('reviewed_at')
    if (error) throw error
    return { profile, decks, cards, reviewLogs: (data as Row[]).map(mapReviewLog) }
  }

  async resetDemoData(): Promise<void> {
    throw new Error('云端模式不能重置演示数据')
  }
}
