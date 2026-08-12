import { describe, expect, it } from 'vitest'
import { mapImportRows, parseDelimitedFile, toCardsCsv } from './csv'

describe('CSV import', () => {
  it('detects a header and maps front/back fields', () => {
    const parsed = parseDelimitedFile('front,back\n首都,北京\n化学式,H2O')
    expect(parsed.headers).toEqual(['front', 'back'])
    expect(mapImportRows(parsed.rows, 0, 1)).toEqual([
      { front: '首都', back: '北京', sourceRow: 1 },
      { front: '化学式', back: 'H2O', sourceRow: 2 }
    ])
  })

  it('keeps the first row when the file has no header', () => {
    const parsed = parseDelimitedFile('苹果,apple\n梨,pear')
    expect(parsed.headers).toEqual(['第 1 列', '第 2 列'])
    expect(mapImportRows(parsed.rows, 0, 1)).toHaveLength(2)
  })

  it('writes quoted values safely', () => {
    expect(toCardsCsv([{ front: 'a,b', back: 'line\nnext' }])).toContain('"a,b"')
  })
})
