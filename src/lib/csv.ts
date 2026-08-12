import Papa from 'papaparse'
import type { ImportRow } from '../types'

export interface ParsedImport {
  headers: string[]
  rows: string[][]
  delimiter: string
  errors: string[]
}

export function parseDelimitedFile(content: string): ParsedImport {
  const parsed = Papa.parse<string[]>(content, {
    skipEmptyLines: 'greedy',
    delimiter: '',
    transform: (value) => value.trim()
  })
  const rows = parsed.data.filter((row) => row.some(Boolean))
  const first = rows[0] ?? []
  const looksLikeHeader = first.some((cell) => /^(front|back|正面|背面|question|answer)$/i.test(cell))
  return {
    headers: looksLikeHeader ? first : first.map((_, index) => `第 ${index + 1} 列`),
    rows: looksLikeHeader ? rows.slice(1) : rows,
    delimiter: parsed.meta.delimiter,
    errors: parsed.errors.map((error) => `第 ${(error.row ?? 0) + 1} 行：${error.message}`)
  }
}

export function mapImportRows(rows: string[][], frontColumn: number, backColumn: number): ImportRow[] {
  return rows
    .map((row, index) => ({
      front: row[frontColumn]?.trim() ?? '',
      back: row[backColumn]?.trim() ?? '',
      sourceRow: index + 1
    }))
    .filter((row) => row.front.length > 0)
}

export function toCardsCsv(cards: Array<{ front: string; back: string }>): string {
  return Papa.unparse(cards, { columns: ['front', 'back'] })
}
