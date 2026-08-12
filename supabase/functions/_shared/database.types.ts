export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Relation = {
  foreignKeyName: string
  columns: string[]
  isOneToOne: boolean
  referencedRelation: string
  referencedColumns: string[]
}

export interface Database {
  public: {
    Tables: {
      decks: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string
          new_cards_per_day: number
          desired_retention: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string
          new_cards_per_day?: number
          desired_retention?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['decks']['Insert']>
        Relationships: Relation[]
      }
      cards: {
        Row: {
          id: string
          user_id: string
          deck_id: string
          front: string
          back: string
          state: string
          due_at: string
          stability: number | null
          difficulty: number | null
          scheduled_days: number
          elapsed_days: number
          repetitions: number
          lapses: number
          last_reviewed_at: string | null
          is_suspended: boolean
          version: number
          import_job_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          deck_id: string
          front: string
          back?: string
          state?: string
          due_at?: string
          stability?: number | null
          difficulty?: number | null
          scheduled_days?: number
          elapsed_days?: number
          repetitions?: number
          lapses?: number
          last_reviewed_at?: string | null
          is_suspended?: boolean
          version?: number
          import_job_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['cards']['Insert']>
        Relationships: Relation[]
      }
      review_logs: {
        Row: {
          id: string
          user_id: string
          card_id: string
          deck_id: string
          rating: number
          reviewed_at: string
          duration_ms: number
          previous_card: Json
          resulting_card: Json
          undone_at: string | null
          created_at: string
        }
        Insert: {
          id: string
          user_id: string
          card_id: string
          deck_id: string
          rating: number
          reviewed_at: string
          duration_ms?: number
          previous_card: Json
          resulting_card: Json
          undone_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['review_logs']['Insert']>
        Relationships: Relation[]
      }
    }
    Views: Record<never, never>
    Functions: {
      commit_review_transition: {
        Args: {
          event_id: string
          card_id_input: string
          rating_input: number
          reviewed_at_input: string
          duration_ms_input: number
          expected_version_input: number
          resulting_state_input: string
          due_at_input: string
          stability_input: number
          difficulty_input: number
          scheduled_days_input: number
          elapsed_days_input: number
          repetitions_input: number
          lapses_input: number
        }
        Returns: Database['public']['Tables']['review_logs']['Row']
      }
    }
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}
