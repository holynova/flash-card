import Dexie, { type EntityTable } from 'dexie'
import type { Card, Deck, ImportJob, Profile, ReviewLog, SubmitReviewInput } from '../types'

export const DEMO_USER_ID = '00000000-0000-4000-8000-000000000001'

export interface PendingReview {
  id: string
  userId: string
  input: SubmitReviewInput
  createdAt: string
  previousCard: Card
  resultingCard: Card
}

class MossDatabase extends Dexie {
  profiles!: EntityTable<Profile, 'id'>
  decks!: EntityTable<Deck, 'id'>
  cards!: EntityTable<Card, 'id'>
  reviewLogs!: EntityTable<ReviewLog, 'id'>
  importJobs!: EntityTable<ImportJob, 'id'>
  pendingReviews!: EntityTable<PendingReview, 'id'>

  constructor() {
    super('moss-card')
    this.version(1).stores({
      profiles: '&id',
      decks: '&id, userId, createdAt, updatedAt',
      cards: '&id, userId, deckId, dueAt, state, isSuspended, importJobId, updatedAt, [deckId+dueAt]',
      reviewLogs: '&id, userId, cardId, deckId, reviewedAt, undoneAt',
      importJobs: '&id, userId, deckId, createdAt, status'
    })
    this.version(2).stores({
      profiles: '&id',
      decks: '&id, userId, createdAt, updatedAt',
      cards: '&id, userId, deckId, dueAt, state, isSuspended, importJobId, updatedAt, [deckId+dueAt]',
      reviewLogs: '&id, userId, cardId, deckId, reviewedAt, undoneAt',
      importJobs: '&id, userId, deckId, createdAt, status',
      pendingReviews: '&id, userId, createdAt'
    })
  }
}

export const localDb = new MossDatabase()
