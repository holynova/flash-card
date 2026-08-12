import { LocalRepository } from './local-repository'
import { SupabaseRepository } from './supabase-repository'
import { isSupabaseConfigured } from '../lib/supabase'
import type { DataRepository } from '../types'

export const repository: DataRepository = isSupabaseConfigured ? new SupabaseRepository() : new LocalRepository()
export const repositoryMode = isSupabaseConfigured ? 'cloud' : 'demo'
