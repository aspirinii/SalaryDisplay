import { describe, expect, it } from 'vitest'
import {
  defaultSettings,
  earnedBetween,
  monthPeriod,
  paidMinutesOfDay,
  paidSecondsBetween,
  ratePerSecond,
  snapshot,
  statusAt,
  weekPeriod,
  type Settings,
} from './index'

/** 로컬 시각 생성: at(2026, 11, 18, 9, 30) = 2026-11-18 09:30 */
const at = (y: number, mo: number, d: number, h = 0, mi = 0, s = 0) =>
  new Date(y, mo - 1, d, h, mi, s)

const H = 3600
const settings = (patch: Partial<Settings> = {}): Settings => ({ ...defaultSettings(), ...patch })

// 2026년 11월: 평일 21일 × 8시간(9–18, 점심 1시간 무급) = 168시간
const NOV_PAID_SECONDS = 21 * 8 * H
const NOV_RATE = 3_000_000 / NOV_PAID_SECONDS

describe('유급 근무 시간', () => {
  it('평일 하루는 점심 제외 8시간', () => {
    const s = settings()
    expect(paidSecondsBetween(s, at(2026, 11, 18).getTime(), at(2026, 11, 19).getTime())).toBe(8 * H)
  })

  it('주말은 0', () => {
    const s = settings()
    expect(paidSecondsBetween(s, at(2026, 11, 21).getTime(), at(2026, 11, 23).getTime())).toBe(0)
  })

  it('2026년 11월 전체는 168시간', () => {
    const s = settings()
    const p = monthPeriod(s, at(2026, 11, 18))
    expect(paidSecondsBetween(s, p.start, p.end)).toBe(NOV_PAID_SECONDS)
  })

  it('점심을 유급으로 바꾸면 9시간', () => {
    const s = settings({ breaksPaidByDefault: true })
    expect(paidSecondsBetween(s, at(2026, 11, 18).getTime(), at(2026, 11, 19).getTime())).toBe(9 * H)
  })

  it('휴게시간별 지정이 전체 기본값보다 우선', () => {
    const s = settings({ breaksPaidByDefault: false })
    s.schedule[3] = { ...s.schedule[3], breaks: [{ start: '12:00', end: '13:00', paid: true }] }
    expect(paidSecondsBetween(s, at(2026, 11, 18).getTime(), at(2026, 11, 19).getTime())).toBe(9 * H)
  })

  it('요일 스케줄 요약(분): 9–18 점심 무급 480, 유급 540, 야간 22–06 휴게 1시간 420', () => {
    const d = defaultSettings().schedule[1]
    expect(paidMinutesOfDay(d, false)).toBe(480)
    expect(paidMinutesOfDay(d, true)).toBe(540)
    expect(
      paidMinutesOfDay({ enabled: true, work: { start: '22:00', end: '06:00' }, breaks: [{ start: '02:00', end: '03:00' }] }, false),
    ).toBe(420)
    expect(paidMinutesOfDay({ ...d, enabled: false }, false)).toBe(0)
  })

  it('공휴일은 근무 없음', () => {
    const s = settings({ holidays: ['2026-11-18'] })
    expect(paidSecondsBetween(s, at(2026, 11, 18).getTime(), at(2026, 11, 19).getTime())).toBe(0)
  })

  it('야간 근무(22:00–06:00, 02:00–03:00 휴게)는 자정을 넘겨 7시간', () => {
    const s = settings()
    s.schedule[3] = {
      enabled: true,
      work: { start: '22:00', end: '06:00' },
      breaks: [{ start: '02:00', end: '03:00' }],
    }
    // 수요일 22시 시작 → 목요일 06시 종료
    const wedNight = paidSecondsBetween(s, at(2026, 11, 18, 22).getTime(), at(2026, 11, 19, 6).getTime())
    expect(wedNight).toBe(7 * H)
    // 목요일 0시 이후 부분만: 00–02, 03–06 = 5시간 (+ 목요일 정상근무 8시간)
    expect(paidSecondsBetween(s, at(2026, 11, 19).getTime(), at(2026, 11, 20).getTime())).toBe(5 * H + 8 * H)
  })
})

describe('상태', () => {
  const s = settings()
  it('근무 중 / 휴게 / 퇴근', () => {
    expect(statusAt(s, at(2026, 11, 18, 10).getTime())).toBe('working')
    expect(statusAt(s, at(2026, 11, 18, 12, 30).getTime())).toBe('break')
    expect(statusAt(s, at(2026, 11, 18, 18).getTime())).toBe('off')
    expect(statusAt(s, at(2026, 11, 18, 8, 59).getTime())).toBe('off')
    expect(statusAt(s, at(2026, 11, 21, 10).getTime())).toBe('off') // 토요일
  })

  it('유급 휴게는 working', () => {
    expect(statusAt(settings({ breaksPaidByDefault: true }), at(2026, 11, 18, 12, 30).getTime())).toBe('working')
  })
})

describe('기간', () => {
  it('주 시작: 월요일 / 일요일', () => {
    expect(new Date(weekPeriod(settings({ weekStartsOn: 1 }), at(2026, 11, 18, 10)).start)).toEqual(at(2026, 11, 16))
    expect(new Date(weekPeriod(settings({ weekStartsOn: 0 }), at(2026, 11, 18, 10)).start)).toEqual(at(2026, 11, 15))
    // 일요일 당일, 월요일 시작이면 전주 월요일
    expect(new Date(weekPeriod(settings({ weekStartsOn: 1 }), at(2026, 11, 22)).start)).toEqual(at(2026, 11, 16))
  })

  it('달력 기준 월', () => {
    const p = monthPeriod(settings(), at(2026, 11, 18))
    expect(new Date(p.start)).toEqual(at(2026, 11, 1))
    expect(new Date(p.end)).toEqual(at(2026, 12, 1))
  })

  it('급여일 기준 월 (25일)', () => {
    const s = settings({ monthBasis: 'payday', payday: 25 })
    const before = monthPeriod(s, at(2026, 11, 18))
    expect(new Date(before.start)).toEqual(at(2026, 10, 25))
    expect(new Date(before.end)).toEqual(at(2026, 11, 25))
    const onPayday = monthPeriod(s, at(2026, 11, 25))
    expect(new Date(onPayday.start)).toEqual(at(2026, 11, 25))
    expect(new Date(onPayday.end)).toEqual(at(2026, 12, 25))
  })

  it('급여일이 없는 달은 말일 (31일 → 2월 28일)', () => {
    const s = settings({ monthBasis: 'payday', payday: 31 })
    const p = monthPeriod(s, at(2027, 2, 28, 10))
    expect(new Date(p.start)).toEqual(at(2027, 2, 28))
    expect(new Date(p.end)).toEqual(at(2027, 3, 31))
    const jan = monthPeriod(s, at(2027, 2, 27))
    expect(new Date(jan.start)).toEqual(at(2027, 1, 31))
    expect(new Date(jan.end)).toEqual(at(2027, 2, 28))
  })
})

describe('금액', () => {
  it('실제 근무시간 기준 단가', () => {
    const s = settings()
    expect(ratePerSecond(s, monthPeriod(s, at(2026, 11, 18)))).toBeCloseTo(NOV_RATE, 10)
  })

  it('월말 퇴근 시점에 정확히 월급', () => {
    const s = settings()
    expect(earnedBetween(s, at(2026, 11, 1).getTime(), at(2026, 11, 30, 18).getTime())).toBeCloseTo(3_000_000, 4)
    // 퇴근 후~자정까지 더 쌓이지 않음
    expect(earnedBetween(s, at(2026, 11, 1).getTime(), at(2026, 12, 1).getTime())).toBeCloseTo(3_000_000, 4)
  })

  it('연봉은 12로 나눔', () => {
    const s = settings({ payType: 'annual', amount: 36_000_000 })
    expect(earnedBetween(s, at(2026, 11, 1).getTime(), at(2026, 12, 1).getTime())).toBeCloseTo(3_000_000, 4)
  })

  it('고정 209시간 기준', () => {
    const s = settings({ rateBasis: 'fixedHours' })
    const rate = 3_000_000 / (209 * H)
    expect(ratePerSecond(s, monthPeriod(s, at(2026, 11, 18)))).toBeCloseTo(rate, 10)
    expect(earnedBetween(s, at(2026, 11, 18).getTime(), at(2026, 11, 19).getTime())).toBeCloseTo(rate * 8 * H, 4)
  })

  it('시급은 근무 초 × 시급/3600', () => {
    const s = settings({ payType: 'hourly', amount: 10_320 })
    expect(earnedBetween(s, at(2026, 11, 18).getTime(), at(2026, 11, 19).getTime())).toBeCloseTo(10_320 * 8, 4)
  })

  it('휴게 중에는 금액이 멈춤 (무급)', () => {
    const s = settings()
    const from = at(2026, 11, 18).getTime()
    const a = earnedBetween(s, from, at(2026, 11, 18, 12, 0).getTime())
    const b = earnedBetween(s, from, at(2026, 11, 18, 12, 59).getTime())
    expect(b).toBe(a)
    expect(a).toBeCloseTo(NOV_RATE * 3 * H, 4)
  })

  it('두 달에 걸친 주는 각 달 단가로 합산', () => {
    // 2026-11-30(월)~12-04(금): 11월 1일 + 12월 4일
    const s = settings()
    const decRate = 3_000_000 / (23 * 8 * H)
    const snap = snapshot(s, at(2026, 12, 4, 18))
    expect(snap.week).toBeCloseTo(NOV_RATE * 8 * H + decRate * 4 * 8 * H, 4)
    expect(snap.month).toBeCloseTo(decRate * 4 * 8 * H, 4)
  })
})

describe('스냅샷', () => {
  const s = settings()

  it('수요일 10:00', () => {
    const snap = snapshot(s, at(2026, 11, 18, 10))
    expect(snap.status).toBe('working')
    expect(snap.today).toBeCloseTo(NOV_RATE * 1 * H, 6)
    expect(snap.week).toBeCloseTo(NOV_RATE * (16 + 1) * H, 6) // 월·화 16시간 + 오늘 1시간
    expect(snap.todayTotal).toBeCloseTo(NOV_RATE * 8 * H, 6)
    expect(snap.todayProgress).toBeCloseTo(1 / 8, 10)
    expect(snap.secondsUntilOff).toBe(8 * H)
  })

  it('퇴근 후에는 오늘 금액 고정, 진행률 100%', () => {
    const snap = snapshot(s, at(2026, 11, 18, 21))
    expect(snap.status).toBe('off')
    expect(snap.today).toBeCloseTo(snap.todayTotal, 6)
    expect(snap.todayProgress).toBe(1)
    expect(snap.secondsUntilOff).toBe(0)
  })

  it('주말은 0원, 이번 주 금액은 유지', () => {
    const snap = snapshot(s, at(2026, 11, 21, 15))
    expect(snap.today).toBe(0)
    expect(snap.todayProgress).toBe(0)
    expect(snap.week).toBeCloseTo(NOV_RATE * 40 * H, 4)
  })
})
