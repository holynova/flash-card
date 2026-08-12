import { Card as FsrsCard, createEmptyCard, fsrs, State, type Grade } from 'ts-fsrs'
import type { Card, CardState, RatingValue, ReviewPreview } from '../types'
import { elapsedDays, formatDueLabel } from './time'

function stateToFsrs(state: CardState): State {
  const mapping: Record<CardState, State> = {
    new: State.New,
    learning: State.Learning,
    review: State.Review,
    relearning: State.Relearning
  }
  return mapping[state]
}

function stateFromFsrs(state: State): CardState {
  const mapping: Record<State, CardState> = {
    [State.New]: 'new',
    [State.Learning]: 'learning',
    [State.Review]: 'review',
    [State.Relearning]: 'relearning'
  }
  return mapping[state]
}

function toFsrsCard(card: Card): FsrsCard {
  if (card.state === 'new' && !card.lastReviewedAt) return createEmptyCard(new Date(card.createdAt))
  return {
    due: new Date(card.dueAt),
    stability: card.stability ?? 0,
    difficulty: card.difficulty ?? 0,
    elapsed_days: card.elapsedDays,
    scheduled_days: card.scheduledDays,
    learning_steps: 0,
    reps: card.repetitions,
    lapses: card.lapses,
    state: stateToFsrs(card.state),
    last_review: card.lastReviewedAt ? new Date(card.lastReviewedAt) : undefined
  }
}

function toRating(value: RatingValue): Grade {
  return value as Grade
}

const labels: Record<RatingValue, string> = {
  1: '重来',
  2: '困难',
  3: '良好',
  4: '简单'
}

function makeScheduler(retention = 0.9) {
  return fsrs({ request_retention: retention, enable_fuzz: true })
}

export function previewReview(card: Card, now = new Date(), retention = 0.9): ReviewPreview[] {
  const previews = makeScheduler(retention).repeat(toFsrsCard(card), now)
  return ([1, 2, 3, 4] as RatingValue[]).map((rating) => {
    const result = previews[toRating(rating)]
    return {
      rating,
      label: labels[rating],
      dueAt: result.card.due.toISOString(),
      intervalLabel: formatDueLabel(result.card.due.toISOString(), now)
    }
  })
}

export function scheduleCard(card: Card, rating: RatingValue, reviewedAt: string, retention = 0.9): Card {
  const now = new Date(reviewedAt)
  const result = makeScheduler(retention).next(toFsrsCard(card), now, toRating(rating))
  return {
    ...card,
    state: stateFromFsrs(result.card.state),
    dueAt: result.card.due.toISOString(),
    stability: result.card.stability,
    difficulty: result.card.difficulty,
    scheduledDays: result.card.scheduled_days,
    elapsedDays: elapsedDays(card.lastReviewedAt, reviewedAt),
    repetitions: result.card.reps,
    lapses: result.card.lapses,
    lastReviewedAt: reviewedAt,
    version: card.version + 1,
    updatedAt: reviewedAt
  }
}
