import { describe, expect, it } from 'vitest'
import { defaultSettings, sanitizeSettings } from './index'

describe('sanitizeSettings', () => {
  it('쓰레기 입력은 기본값', () => {
    expect(sanitizeSettings(null)).toEqual(defaultSettings())
    expect(sanitizeSettings('x')).toEqual(defaultSettings())
    expect(sanitizeSettings({})).toEqual(defaultSettings())
  })

  it('정상 값은 그대로 유지', () => {
    const s = defaultSettings()
    s.payType = 'annual'
    s.amount = 50_000_000
    s.monthBasis = 'payday'
    s.payday = 10
    s.weekStartsOn = 0
    s.breaksPaidByDefault = true
    s.schedule[6] = { enabled: true, work: { start: '22:00', end: '06:00' }, breaks: [{ start: '02:00', end: '03:00', paid: false }] }
    s.holidays = ['2026-12-25']
    expect(sanitizeSettings(JSON.parse(JSON.stringify(s)))).toEqual(s)
  })

  it('잘못된 시각·휴게·범위 밖 숫자를 바로잡음', () => {
    const s = sanitizeSettings({
      amount: -5,
      payday: 45,
      payType: 'weekly',
      schedule: {
        1: { enabled: true, work: { start: '', end: '18:00' }, breaks: [{ start: '12:00', end: '25:00' }, { start: '15:00', end: '15:10' }] },
      },
      holidays: ['2026-12-25', 'bad', '2026-12-25'],
    })
    const d = defaultSettings()
    expect(s.amount).toBe(0)
    expect(s.payday).toBe(31)
    expect(s.payType).toBe(d.payType)
    expect(s.schedule[1].work).toEqual(d.schedule[1].work)
    expect(s.schedule[1].breaks).toEqual([{ start: '15:00', end: '15:10' }])
    expect(s.schedule[2]).toEqual(d.schedule[2])
    expect(s.holidays).toEqual(['2026-12-25'])
  })
})
