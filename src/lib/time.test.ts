import { describe, expect, it } from 'vitest'
import { calculateStreak, formatDueLabel } from './time'

describe('time helpers', () => {
  it('counts a streak that ended today', () => {
    const now = new Date('2026-08-12T12:00:00+08:00')
    expect(calculateStreak([
      '2026-08-12T08:00:00+08:00',
      '2026-08-11T08:00:00+08:00',
      '2026-08-10T08:00:00+08:00'
    ], now)).toBe(3)
  })

  it('formats review intervals for the UI', () => {
    const now = new Date('2026-08-12T00:00:00Z')
    expect(formatDueLabel('2026-08-12T00:10:00Z', now)).toBe('10 分钟')
    expect(formatDueLabel('2026-08-15T00:00:00Z', now)).toBe('3 天')
  })
})
