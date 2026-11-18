import type { BreakRange, DaySchedule, Settings, Weekday } from './types'
import { defaultSettings } from './defaults'
import { parseHHMM } from './time'

/**
 * 저장소(localStorage)나 입력 폼에서 온 값을 안전한 Settings로 정리.
 * 잘못되거나 빠진 값은 기본값으로 채운다. 엔진은 이 결과만 받는다고 가정.
 */

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

function validTime(v: unknown): v is string {
  if (typeof v !== 'string') return false
  try {
    parseHHMM(v)
    return true
  } catch {
    return false
  }
}

function num(v: unknown, fallback: number, min: number, max: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback
}

function pick<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(v as T) ? (v as T) : fallback
}

function sanitizeBreak(v: unknown): BreakRange | null {
  if (!isObj(v) || !validTime(v.start) || !validTime(v.end)) return null
  const br: BreakRange = { start: v.start, end: v.end }
  if (typeof v.paid === 'boolean') br.paid = v.paid
  return br
}

function sanitizeDay(v: unknown, fallback: DaySchedule): DaySchedule {
  if (!isObj(v)) return fallback
  const work = isObj(v.work) && validTime(v.work.start) && validTime(v.work.end)
    ? { start: v.work.start, end: v.work.end }
    : fallback.work
  const breaks = Array.isArray(v.breaks)
    ? v.breaks.map(sanitizeBreak).filter((b): b is BreakRange => b !== null)
    : fallback.breaks
  return {
    enabled: typeof v.enabled === 'boolean' ? v.enabled : fallback.enabled,
    work,
    breaks,
  }
}

export function sanitizeSettings(raw: unknown): Settings {
  const d = defaultSettings()
  if (!isObj(raw)) return d

  const schedule = { ...d.schedule }
  if (isObj(raw.schedule)) {
    for (let i = 0; i < 7; i++) {
      const day = i as Weekday
      schedule[day] = sanitizeDay(raw.schedule[i], d.schedule[day])
    }
  }

  return {
    payType: pick(raw.payType, ['annual', 'monthly', 'hourly'] as const, d.payType),
    amount: num(raw.amount, d.amount, 0, 1e12),
    rateBasis: pick(raw.rateBasis, ['actualSchedule', 'fixedHours'] as const, d.rateBasis),
    fixedMonthlyHours: num(raw.fixedMonthlyHours, d.fixedMonthlyHours, 1, 744),
    schedule,
    breaksPaidByDefault:
      typeof raw.breaksPaidByDefault === 'boolean' ? raw.breaksPaidByDefault : d.breaksPaidByDefault,
    weekStartsOn: raw.weekStartsOn === 0 ? 0 : raw.weekStartsOn === 1 ? 1 : d.weekStartsOn,
    monthBasis: pick(raw.monthBasis, ['calendar', 'payday'] as const, d.monthBasis),
    payday: Math.round(num(raw.payday, d.payday, 1, 31)),
    holidays: Array.isArray(raw.holidays)
      ? [...new Set(raw.holidays.filter((h): h is string => typeof h === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(h)))].sort()
      : d.holidays,
  }
}
