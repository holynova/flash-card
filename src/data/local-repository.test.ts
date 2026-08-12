import { beforeEach, describe, expect, it } from 'vitest'
import { LocalRepository } from './local-repository'
import { localDb } from './local-db'

describe('LocalRepository core loop', () => {
  beforeEach(async () => {
    await localDb.delete()
    await localDb.open()
  })

  it('creates a deck and card then exposes it in the study queue', async () => {
    const repository = new LocalRepository()
    const deck = await repository.createDeck({ name: '测试牌组', newCardsPerDay: 3 })
    const card = await repository.createCard({ deckId: deck.id, front: '问题', back: '答案' })
    const queue = await repository.getStudyQueue(deck.id)
    expect(queue.find((item) => item.id === card.id)).toBeDefined()
  })

  it('deduplicates review submissions by event id and can undo', async () => {
    const repository = new LocalRepository()
    const deck = await repository.createDeck({ name: '幂等测试' })
    const card = await repository.createCard({ deckId: deck.id, front: 'Q', back: 'A' })
    const input = { eventId: 'event-1', cardId: card.id, rating: 3 as const, reviewedAt: new Date().toISOString(), durationMs: 900, expectedVersion: 0 }
    const first = await repository.submitReview(input)
    const second = await repository.submitReview(input)
    expect(second.id).toBe(first.id)
    expect((await repository.getCard(card.id))?.version).toBe(1)
    expect((await repository.undoLastReview())?.version).toBe(0)
  })

  it('imports rows and reverts the whole batch', async () => {
    const repository = new LocalRepository()
    const deck = await repository.createDeck({ name: '导入测试' })
    const job = await repository.importCards(deck.id, 'cards.csv', [
      { front: 'A', back: '1', sourceRow: 1 },
      { front: 'A', back: '1', sourceRow: 2 },
      { front: 'B', back: '2', sourceRow: 3 }
    ], false)
    expect(job.importedRows).toBe(2)
    await repository.revertImport(job.id)
    expect(await repository.listCards(deck.id)).toHaveLength(0)
  })
})
