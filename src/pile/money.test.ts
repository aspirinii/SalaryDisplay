import { describe, expect, it } from 'vitest'
import { defaultSettings } from '../engine'
import { breakdown, bundle, denomsFor, hourlySlots, planPile, totalPieces } from './money'

describe('금액 → 동전·지폐 개수', () => {
  it('한 가지 단위: 몫과 다음 1개 진행률', () => {
    const b = breakdown(1_250, denomsFor('single', 500))
    expect(b.counts).toEqual({ 500: 2 })
    expect(b.next).toBeCloseTo(0.5)
    expect(b.nextDenom).toBe(500)
  })

  it('섞어서: 거스름돈처럼 큰 단위부터', () => {
    const b = breakdown(54_749.4, denomsFor('mixed', 500))
    expect(b.counts).toEqual({ 10000: 5, 1000: 4, 500: 1, 100: 2 })
    expect(b.next).toBeCloseTo(0.494)
  })

  it('동전만 / 지폐만', () => {
    expect(breakdown(1_700, denomsFor('coins', 100)).counts).toEqual({ 500: 3, 100: 2 })
    expect(breakdown(17_999, denomsFor('bills', 100)).counts).toEqual({ 10000: 1, 5000: 1, 1000: 2 })
  })

  it('0원·음수는 비어 있음', () => {
    expect(breakdown(0, [500]).counts).toEqual({})
    expect(breakdown(-5, [500]).next).toBe(0)
  })
})

describe('넘칠 때 묶음', () => {
  it('상한 안이면 그대로', () => {
    expect(bundle(500, 30, 100)).toEqual({ denom: 500, crates: 0, packs: 0, loose: 30 })
  })
  it('동전 50개 = 롤 1개', () => {
    expect(bundle(100, 1_430, 100)).toEqual({ denom: 100, crates: 0, packs: 28, loose: 30 })
  })
  it('낱개를 최대한 남김', () => {
    // 1,154개, 상한 300 → 롤 18개 + 낱개 254개
    expect(bundle(100, 1_154, 300)).toEqual({ denom: 100, crates: 0, packs: 18, loose: 254 })
  })
  it('롤도 넘치면 자루(1,000개)', () => {
    expect(bundle(100, 30_000, 50)).toEqual({ denom: 100, crates: 30, packs: 0, loose: 0 })
  })
  it('지폐 100장 = 다발', () => {
    expect(bundle(10000, 250, 60)).toEqual({ denom: 10000, crates: 0, packs: 2, loose: 50 })
  })

  it('자동 환전: 넘치면 더 큰 단위로', () => {
    const p = planPile(143_000, { mode: 'single', unit: 100, overflow: 'exchange', cap: 100 })
    expect(totalPieces(p.breakdown.counts)).toBeLessThan(100)
    expect(p.breakdown.counts[10000]).toBe(14)
  })

  it('줄여 보기: 조각이 작아지고 개수는 그대로', () => {
    const p = planPile(100 * 400, { mode: 'single', unit: 100, overflow: 'shrink', cap: 100 })
    expect(p.groups[0].loose).toBe(400)
    expect(p.scale).toBeCloseTo(0.425)
  })
})

describe('시간별 칸', () => {
  const at = (h: number, m = 0) => new Date(2026, 10, 18, h, m) // 수요일
  it('9~18시 → 9칸, 점심 칸은 0원', () => {
    const slots = hourlySlots(defaultSettings(), at(10, 30))
    expect(slots.map((s) => s.label)).toEqual(['9시', '10시', '11시', '12시', '13시', '14시', '15시', '16시', '17시'])
    expect(slots[3].total).toBe(0)
    expect(slots[0].state).toBe('past')
    expect(slots[1].state).toBe('now')
    expect(slots[1].amount).toBeCloseTo(slots[1].total / 2)
    expect(slots[2].amount).toBe(0)
  })
  it('쉬는 날은 칸 없음', () => {
    expect(hourlySlots(defaultSettings(), new Date(2026, 10, 22, 10))).toEqual([])
  })
})
