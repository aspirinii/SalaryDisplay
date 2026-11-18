import type { DaySchedule, Interval, Settings, Weekday } from './types'
import { DAY_MINUTES, addDays, atMinutes, parseHHMM, startOfDay, toDateKey } from './time'

interface DayShift {
  /** 근무 전체 구간 (휴게 포함) */
  shift: Interval
  /** 돈이 쌓이는 구간들 (무급 휴게 제외), 시간순 */
  paid: Interval[]
}

/** 분 단위 구간에서 다른 구간들을 빼기 */
function subtract(base: [number, number], cuts: [number, number][]): [number, number][] {
  let parts: [number, number][] = [base]
  for (const [cs, ce] of cuts) {
    const next: [number, number][] = []
    for (const [s, e] of parts) {
      if (ce <= s || cs >= e) {
        next.push([s, e])
        continue
      }
      if (cs > s) next.push([s, cs])
      if (ce < e) next.push([ce, e])
    }
    parts = next
  }
  return parts
}

/**
 * 특정 날짜에 "시작하는" 근무. 야간 근무는 다음날 새벽까지 이어질 수 있다.
 * 근무가 없으면 null.
 */
export function shiftForDay(settings: Settings, day: Date): DayShift | null {
  const date = startOfDay(day)
  const sched = settings.schedule[date.getDay() as Weekday]
  if (!sched?.enabled) return null
  if (settings.holidays.includes(toDateKey(date))) return null

  const ws = parseHHMM(sched.work.start)
  let we = parseHHMM(sched.work.end)
  if (we <= ws) we += DAY_MINUTES // 야간 근무
  if (we === ws) return null

  const unpaid: [number, number][] = []
  for (const br of sched.breaks) {
    const paid = br.paid ?? settings.breaksPaidByDefault
    if (paid) continue
    let bs = parseHHMM(br.start)
    let be = parseHHMM(br.end)
    // 야간 근무 중 자정 이후 휴게는 다음날 시각으로 해석
    if (bs < ws) bs += DAY_MINUTES
    if (be <= bs) be += DAY_MINUTES
    const s = Math.max(bs, ws)
    const e = Math.min(be, we)
    if (e > s) unpaid.push([s, e])
  }

  const toInterval = ([s, e]: [number, number]): Interval => ({
    start: atMinutes(date, s),
    end: atMinutes(date, e),
  })

  return {
    shift: toInterval([ws, we]),
    paid: subtract([ws, we], unpaid).map(toInterval),
  }
}

/** 요일 스케줄 하나의 유급 근무 분 (날짜·공휴일 무관, 설정 화면 요약용) */
export function paidMinutesOfDay(day: DaySchedule, breaksPaidByDefault: boolean): number {
  if (!day.enabled) return 0
  const ref = new Date(2000, 0, 3) // 아무 날짜. 그 요일 자리에 이 스케줄만 넣어 계산
  const settings = {
    schedule: { [ref.getDay()]: day },
    holidays: [],
    breaksPaidByDefault,
  } as unknown as Settings
  const shift = shiftForDay(settings, ref)
  return shift ? shift.paid.reduce((sum, iv) => sum + (iv.end - iv.start), 0) / 60_000 : 0
}

/** [from, to) 구간과 겹치는 모든 근무 (전날 시작한 야간 근무 포함) */
export function shiftsBetween(settings: Settings, from: number, to: number): DayShift[] {
  if (to <= from) return []
  const result: DayShift[] = []
  let day = addDays(new Date(from), -1)
  const lastDay = startOfDay(new Date(to))
  while (day.getTime() <= lastDay.getTime()) {
    const shift = shiftForDay(settings, day)
    if (shift && shift.shift.end > from && shift.shift.start < to) result.push(shift)
    day = addDays(day, 1)
  }
  return result
}

/** [from, to) 안의 유급 근무 초 */
export function paidSecondsBetween(settings: Settings, from: number, to: number): number {
  let ms = 0
  for (const { paid } of shiftsBetween(settings, from, to)) {
    for (const iv of paid) {
      const s = Math.max(iv.start, from)
      const e = Math.min(iv.end, to)
      if (e > s) ms += e - s
    }
  }
  return ms / 1000
}
