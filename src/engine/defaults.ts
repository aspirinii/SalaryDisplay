import type { DaySchedule, Settings, Weekday } from './types'

const weekday = (): DaySchedule => ({
  enabled: true,
  work: { start: '09:00', end: '18:00' },
  breaks: [{ start: '12:00', end: '13:00' }],
})

const dayOff = (): DaySchedule => ({ ...weekday(), enabled: false })

export function defaultSchedule(): Record<Weekday, DaySchedule> {
  return {
    0: dayOff(),
    1: weekday(),
    2: weekday(),
    3: weekday(),
    4: weekday(),
    5: weekday(),
    6: dayOff(),
  }
}

export function defaultSettings(): Settings {
  return {
    payType: 'monthly',
    amount: 3_000_000,
    rateBasis: 'actualSchedule',
    fixedMonthlyHours: 209,
    schedule: defaultSchedule(),
    breaksPaidByDefault: false,
    weekStartsOn: 1,
    monthBasis: 'calendar',
    payday: 25,
    holidays: [],
  }
}
