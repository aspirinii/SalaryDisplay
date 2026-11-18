import type { EarningsSnapshot, Interval, Settings, WorkStatus } from './types'
import { dayPeriod, monthPeriod, weekPeriod } from './periods'
import { paidSecondsBetween, shiftsBetween } from './schedule'

/** 연봉/월급 → 월급. 시급은 월급 개념 없이 초당 단가로 바로 계산. */
export function monthlyAmount(settings: Settings): number {
  switch (settings.payType) {
    case 'annual':
      return settings.amount / 12
    case 'monthly':
      return settings.amount
    case 'hourly':
      return settings.amount * settings.fixedMonthlyHours
  }
}

/** 해당 월 기간의 초당 단가 */
export function ratePerSecond(settings: Settings, period: Interval): number {
  if (settings.payType === 'hourly') return settings.amount / 3600
  const monthly = monthlyAmount(settings)
  if (settings.rateBasis === 'fixedHours') {
    const secs = settings.fixedMonthlyHours * 3600
    return secs > 0 ? monthly / secs : 0
  }
  const secs = paidSecondsBetween(settings, period.start, period.end)
  return secs > 0 ? monthly / secs : 0
}

/** [from, to) 동안 번 금액. 월 기간 경계를 넘으면 기간별 단가로 나눠 합산. */
export function earnedBetween(settings: Settings, from: number, to: number): number {
  let total = 0
  let cursor = from
  while (cursor < to) {
    const period = monthPeriod(settings, new Date(cursor))
    const segEnd = Math.min(period.end, to)
    total += paidSecondsBetween(settings, cursor, segEnd) * ratePerSecond(settings, period)
    cursor = segEnd
  }
  return total
}

export function statusAt(settings: Settings, now: number): WorkStatus {
  for (const { shift, paid } of shiftsBetween(settings, now, now + 1)) {
    if (now < shift.start || now >= shift.end) continue
    return paid.some((iv) => now >= iv.start && now < iv.end) ? 'working' : 'break'
  }
  return 'off'
}

export function snapshot(settings: Settings, nowDate: Date): EarningsSnapshot {
  const now = nowDate.getTime()
  const day = dayPeriod(nowDate)
  const week = weekPeriod(settings, nowDate)
  const month = monthPeriod(settings, nowDate)

  const today = earnedBetween(settings, day.start, now)
  const todayTotal = earnedBetween(settings, day.start, day.end)

  // 오늘(달력 기준) 안에서 마지막 유급 구간이 끝나는 시각
  let lastPaidEnd = 0
  for (const { paid } of shiftsBetween(settings, day.start, day.end)) {
    for (const iv of paid) {
      const end = Math.min(iv.end, day.end)
      if (end > day.start) lastPaidEnd = Math.max(lastPaidEnd, end)
    }
  }

  return {
    today,
    week: earnedBetween(settings, week.start, now),
    month: earnedBetween(settings, month.start, now),
    ratePerSecond: ratePerSecond(settings, month),
    status: statusAt(settings, now),
    todayTotal,
    weekTotal: earnedBetween(settings, week.start, week.end),
    monthTotal: earnedBetween(settings, month.start, month.end),
    todayProgress: todayTotal > 0 ? Math.min(1, today / todayTotal) : 0,
    secondsUntilOff: Math.max(0, (lastPaidEnd - now) / 1000),
    monthPeriod: month,
  }
}
