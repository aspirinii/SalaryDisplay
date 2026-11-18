import type { DaySchedule, Weekday } from '../engine'

export interface SchedulePreset {
  label: string
  start: string
  end: string
  days: Weekday[]
}

/** 근무시간 프리셋 (설정 패널·첫 실행 안내 공용) */
export const SCHEDULE_PRESETS: SchedulePreset[] = [
  { label: '9–6', start: '09:00', end: '18:00', days: [1, 2, 3, 4, 5] },
  { label: '10–7', start: '10:00', end: '19:00', days: [1, 2, 3, 4, 5] },
  { label: '8–5', start: '08:00', end: '17:00', days: [1, 2, 3, 4, 5] },
  { label: '주4일 (월–목 9–6)', start: '09:00', end: '18:00', days: [1, 2, 3, 4] },
]

/** 프리셋을 요일별 스케줄에 적용 (휴게시간은 유지) */
export function applySchedulePreset(
  schedule: Record<Weekday, DaySchedule>,
  p: SchedulePreset,
): Record<Weekday, DaySchedule> {
  const next = { ...schedule }
  for (const d of [0, 1, 2, 3, 4, 5, 6] as Weekday[]) {
    next[d] = { ...schedule[d], enabled: p.days.includes(d), work: { start: p.start, end: p.end } }
  }
  return next
}
