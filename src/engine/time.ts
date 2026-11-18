/** 로컬 시간 기준 날짜 유틸. 모든 계산은 기기의 로컬 시간대를 따른다. */

export const MINUTE_MS = 60_000
export const DAY_MINUTES = 24 * 60

/** "HH:MM" → 자정부터의 분. "24:00" 허용. */
export function parseHHMM(value: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) throw new Error(`잘못된 시각 형식: "${value}" (HH:MM 필요)`)
  const h = Number(match[1])
  const m = Number(match[2])
  if (h > 24 || m > 59 || (h === 24 && m !== 0)) {
    throw new Error(`잘못된 시각: "${value}"`)
  }
  return h * 60 + m
}

/** 해당 날짜 00:00 (로컬) */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

/** 날짜 00:00 + 분 (분이 1440을 넘으면 다음날로 자연스럽게 넘어감) */
export function atMinutes(day: Date, minutes: number): number {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, minutes).getTime()
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/** 'YYYY-MM-DD' (로컬) */
export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
