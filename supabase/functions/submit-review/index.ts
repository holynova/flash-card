import { withSupabase } from 'npm:@supabase/server'
import { fsrs, State, type Grade } from 'npm:ts-fsrs@5.4.1'
import type { Database } from '../_shared/database.types.ts'

type RatingValue = 1 | 2 | 3 | 4

interface ReviewRequest {
  eventId: string
  cardId: string
  rating: RatingValue
  reviewedAt: string
  durationMs: number
  expectedVersion: number
}

const stateMap: Record<string, State> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning
}

const reverseStateMap: Record<State, string> = {
  [State.New]: 'new',
  [State.Learning]: 'learning',
  [State.Review]: 'review',
  [State.Relearning]: 'relearning'
}

export default {
  fetch: withSupabase<Database>({ auth: 'user' }, async (request, context) => {
    if (request.method !== 'POST') return Response.json({ message: 'Method not allowed' }, { status: 405 })
    const body = (await request.json()) as ReviewRequest
    if (![1, 2, 3, 4].includes(body.rating)) return Response.json({ message: 'Invalid rating' }, { status: 400 })

    const { data: card, error: cardError } = await context.supabase
      .from('cards')
      .select('*')
      .eq('id', body.cardId)
      .single()
    if (cardError || !card) return Response.json({ message: 'Card not found' }, { status: 404 })
    if (card.version !== body.expectedVersion) return Response.json({ message: 'Card version conflict' }, { status: 409 })

    const { data: deck } = await context.supabase
      .from('decks')
      .select('desired_retention')
      .eq('id', card.deck_id)
      .single()

    const scheduler = fsrs({ request_retention: deck?.desired_retention ?? 0.9, enable_fuzz: true })
    const reviewedAt = new Date(body.reviewedAt)
    const result = scheduler.next(
      {
        due: new Date(card.due_at),
        stability: card.stability ?? 0,
        difficulty: card.difficulty ?? 0,
        elapsed_days: card.elapsed_days,
        scheduled_days: card.scheduled_days,
        learning_steps: 0,
        reps: card.repetitions,
        lapses: card.lapses,
        state: stateMap[card.state],
        last_review: card.last_reviewed_at ? new Date(card.last_reviewed_at) : undefined
      },
      reviewedAt,
      body.rating as Grade
    )

    const { data, error } = await context.supabase.rpc('commit_review_transition', {
      event_id: body.eventId,
      card_id_input: body.cardId,
      rating_input: body.rating,
      reviewed_at_input: body.reviewedAt,
      duration_ms_input: Math.max(0, Math.min(body.durationMs, 86_400_000)),
      expected_version_input: body.expectedVersion,
      resulting_state_input: reverseStateMap[result.card.state],
      due_at_input: result.card.due.toISOString(),
      stability_input: result.card.stability,
      difficulty_input: result.card.difficulty,
      scheduled_days_input: result.card.scheduled_days,
      elapsed_days_input: result.card.elapsed_days,
      repetitions_input: result.card.reps,
      lapses_input: result.card.lapses
    })

    if (error) {
      const status = error.message.includes('card_version_conflict') ? 409 : 400
      return Response.json({ message: error.message }, { status })
    }
    return Response.json({ review: data })
  })
}
