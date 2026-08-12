export type CardState = 'new' | 'learning' | 'review' | 'relearning'
export type RatingValue = 1 | 2 | 3 | 4

export interface Profile {
  id: string
  email: string
  timezone: string
  defaultNewCardsPerDay: number
  defaultRetention: number
}

export interface Deck {
  id: string
  userId: string
  name: string
  description: string
  newCardsPerDay: number
  desiredRetention: number
  createdAt: string
  updatedAt: string
}

export interface Card {
  id: string
  userId: string
  deckId: string
  front: string
  back: string
  state: CardState
  dueAt: string
  stability: number | null
  difficulty: number | null
  scheduledDays: number
  elapsedDays: number
  repetitions: number
  lapses: number
  lastReviewedAt: string | null
  isSuspended: boolean
  version: number
  importJobId: string | null
  createdAt: string
  updatedAt: string
}

export interface ReviewLog {
  id: string
  userId: string
  cardId: string
  deckId: string
  rating: RatingValue
  reviewedAt: string
  durationMs: number
  previousCard: Card
  resultingCard: Card
  undoneAt: string | null
}

export interface ImportJob {
  id: string
  userId: string
  deckId: string
  filename: string
  status: 'processing' | 'complete' | 'failed' | 'reverted'
  totalRows: number
  importedRows: number
  skippedRows: number
  errorSummary: string | null
  createdAt: string
}

export interface TodaySummary {
  due: number
  fresh: number
  completed: number
  estimatedMinutes: number
  streak: number
}

export interface DeckSummary extends Deck {
  totalCards: number
  dueCards: number
  newCards: number
  completedToday: number
}

export interface CreateDeckInput {
  name: string
  description?: string
  newCardsPerDay?: number
  desiredRetention?: number
}

export interface CreateCardInput {
  deckId: string
  front: string
  back: string
  importJobId?: string | null
}

export interface ImportRow {
  front: string
  back: string
  sourceRow: number
}

export interface SubmitReviewInput {
  eventId: string
  cardId: string
  rating: RatingValue
  reviewedAt: string
  durationMs: number
  expectedVersion: number
}

export interface ReviewPreview {
  rating: RatingValue
  label: string
  dueAt: string
  intervalLabel: string
}

export interface DataRepository {
  getProfile(): Promise<Profile>
  listDecks(): Promise<DeckSummary[]>
  getDeck(id: string): Promise<DeckSummary | null>
  createDeck(input: CreateDeckInput): Promise<Deck>
  updateDeck(id: string, input: Partial<CreateDeckInput>): Promise<Deck>
  deleteDeck(id: string): Promise<void>
  listCards(deckId?: string, query?: string): Promise<Card[]>
  getCard(id: string): Promise<Card | null>
  createCard(input: CreateCardInput): Promise<Card>
  updateCard(id: string, input: Pick<CreateCardInput, 'front' | 'back'>): Promise<Card>
  setCardSuspended(id: string, suspended: boolean): Promise<Card>
  deleteCard(id: string): Promise<void>
  getTodaySummary(): Promise<TodaySummary>
  getStudyQueue(deckId?: string): Promise<Card[]>
  submitReview(input: SubmitReviewInput): Promise<ReviewLog>
  undoLastReview(): Promise<Card | null>
  importCards(deckId: string, filename: string, rows: ImportRow[], keepDuplicates: boolean): Promise<ImportJob>
  revertImport(jobId: string): Promise<void>
  exportData(): Promise<{ profile: Profile; decks: Deck[]; cards: Card[]; reviewLogs: ReviewLog[] }>
  resetDemoData(): Promise<void>
}
