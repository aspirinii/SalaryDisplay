import type { Interval, Settings } from './types'
import { addDays, daysInMonth, startOfDay } from './time'

export function dayPeriod(now: Date): Interval {
  const start = startOfDay(now)
  return { start: start.getTime(), end: addDays(start, 1).getTime() }
}

export function weekPeriod(settings: Settings, now: Date): Interval {
  const today = startOfDay(now)
  const back = (today.getDay() - settings.weekStartsOn + 7) % 7
  const start = addDays(today, -back)
  return { start: start.getTime(), end: addDays(start, 7).getTime() }
}

/** 급여일이 그 달에 없으면(예: 2월 31일) 말일로 */
function paydayOf(year: number, month: number, payday: number): Date {
  const day = Math.min(Math.max(1, Math.floor(payday)), daysInMonth(year, month))
  return new Date(year, month, day)
}

/** 지금이 속한 "한 달" 기간 */
export function monthPeriod(settings: Settings, now: Date): Interval {
  const y = now.getFullYear()
  const m = now.getMonth()
  if (settings.monthBasis === 'calendar') {
    return { start: new Date(y, m, 1).getTime(), end: new Date(y, m + 1, 1).getTime() }
  }
  const thisStart = paydayOf(y, m, settings.payday)
  if (now.getTime() >= thisStart.getTime()) {
    return { start: thisStart.getTime(), end: paydayOf(y, m + 1, settings.payday).getTime() }
  }
  return { start: paydayOf(y, m - 1, settings.payday).getTime(), end: thisStart.getTime() }
}
