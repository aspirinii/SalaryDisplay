import type { EarningsSnapshot, Interval, Settings, WorkStatus } from './types'
import { dayPeriod, monthPeriod, weekPeriod, yearPeriod } from './periods'
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

/**
 * 월 기간 단위 계산 캐시. Settings는 바뀔 때마다 새 객체이므로 객체별로 보관하면
 * 설정이 바뀌는 즉시 자동으로 무효화된다. (매 프레임 1년치 합산을 가볍게)
 */
const periodCache = new WeakMap<Settings, Map<string, number>>()
function cached(settings: Settings, key: string, compute: () => number): number {
  let m = periodCache.get(settings)
  if (!m) periodCache.set(settings, (m = new Map()))
  let v = m.get(key)
  if (v === undefined) m.set(key, (v = compute()))
  return v
}

/** 해당 월 기간의 초당 단가 */
export function ratePerSecond(settings: Settings, period: Interval): number {
  if (settings.payType === 'hourly') return settings.amount / 3600
  const monthly = monthlyAmount(settings)
  if (settings.rateBasis === 'fixedHours') {
    const secs = settings.fixedMonthlyHours * 3600
    return secs > 0 ? monthly / secs : 0
  }
  const secs = cached(settings, `secs:${period.start}`, () => paidSecondsBetween(settings, period.start, period.end))
  return secs > 0 ? monthly / secs : 0
}

/** [from, to) 동안 번 금액. 월 기간 경계를 넘으면 기간별 단가로 나눠 합산. */
export function earnedBetween(settings: Settings, from: number, to: number): number {
  let total = 0
  let cursor = from
  while (cursor < to) {
    const period = monthPeriod(settings, new Date(cursor))
    const segEnd = Math.min(period.end, to)
    const segStart = cursor
    const whole = segStart === period.start && segEnd === period.end
    const earn = () => paidSecondsBetween(settings, segStart, segEnd) * ratePerSecond(settings, period)
    total += whole ? cached(settings, `earn:${period.start}`, earn) : earn()
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

export interface SnapshotOptions {
  /** 올해 누적·전체 금액도 계산 (올해 위젯이 있을 때만) */
  year?: boolean
}

export function snapshot(settings: Settings, nowDate: Date, opts: SnapshotOptions = {}): EarningsSnapshot {
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
    ...(opts.year ? yearFigures(settings, nowDate, now) : { year: 0, yearTotal: 0 }),
    todayProgress: todayTotal > 0 ? Math.min(1, today / todayTotal) : 0,
    secondsUntilOff: Math.max(0, (lastPaidEnd - now) / 1000),
    monthPeriod: month,
  }
}

function yearFigures(settings: Settings, nowDate: Date, now: number) {
  const year = yearPeriod(nowDate)
  return {
    year: earnedBetween(settings, year.start, now),
    yearTotal: earnedBetween(settings, year.start, year.end),
  }
}
