import { describe, expect, it } from 'vitest'
import { previewReview, scheduleCard } from './scheduler'
import type { Card } from '../types'

const card: Card = {
  id: 'card-1', userId: 'user-1', deckId: 'deck-1', front: 'Q', back: 'A', state: 'new',
  dueAt: '2026-08-12T00:00:00.000Z', stability: null, difficulty: null, scheduledDays: 0,
  elapsedDays: 0, repetitions: 0, lapses: 0, lastReviewedAt: null, isSuspended: false,
  version: 0, importJobId: null, createdAt: '2026-08-12T00:00:00.000Z', updatedAt: '2026-08-12T00:00:00.000Z'
}

describe('FSRS scheduling', () => {
  it('previews all four ratings', () => {
    const previews = previewReview(card, new Date('2026-08-12T01:00:00.000Z'))
    expect(previews.map((item) => item.rating)).toEqual([1, 2, 3, 4])
    expect(previews.every((item) => new Date(item.dueAt).getTime() > 0)).toBe(true)
  })

  it('increments card version and review count atomically in the state result', () => {
    const next = scheduleCard(card, 3, '2026-08-12T01:00:00.000Z')
    expect(next.version).toBe(1)
    expect(next.repetitions).toBe(1)
    expect(next.lastReviewedAt).toBe('2026-08-12T01:00:00.000Z')
  })
})
