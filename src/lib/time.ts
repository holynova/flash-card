import { differenceInCalendarDays, format, isToday, startOfDay, subDays } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export function formatDueLabel(iso: string, now = new Date()): string {
  const due = new Date(iso)
  const milliseconds = due.getTime() - now.getTime()
  const minutes = Math.max(1, Math.round(milliseconds / 60_000))
  if (minutes < 60) return `${minutes} 分钟`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} 小时`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} 天`
  const months = Math.round(days / 30)
  return `${months} 个月`
}

export function formatLongDate(date = new Date()): string {
  return format(date, 'M 月 d 日 EEEE', { locale: zhCN })
}

export function localDayKey(date = new Date()): string {
  return format(date, 'yyyy-MM-dd')
}

export function calculateStreak(reviewDates: string[], now = new Date()): number {
  if (reviewDates.length === 0) return 0
  const days = new Set(reviewDates.map((value) => localDayKey(new Date(value))))
  let cursor = startOfDay(now)
  if (!days.has(localDayKey(cursor))) cursor = subDays(cursor, 1)
  let streak = 0
  while (days.has(localDayKey(cursor))) {
    streak += 1
    cursor = subDays(cursor, 1)
  }
  return streak
}

export function elapsedDays(from: string | null, to: string): number {
  if (!from) return 0
  return Math.max(0, differenceInCalendarDays(new Date(to), new Date(from)))
}

export function reviewedToday(value: string): boolean {
  return isToday(new Date(value))
}
