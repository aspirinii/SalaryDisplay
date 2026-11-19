import { describe, expect, it } from 'vitest'
import { GOLD_MAPS, goldLook, goldPieceFor, packFor } from './gold'
import { DENOMS, planPile } from './money'

describe('원화 단위 → 금 조각', () => {
  it('기본 표 "10원부터 금": 10원 금화, 100원 골드바, 500원 이상 금괴', () => {
    const look = goldLook('tenUp')
    expect(look(10)).toMatchObject({ family: 'gcoin', gold: 'coin' })
    expect(look(50)).toMatchObject({ family: 'gcoin', gold: 'bigCoin' })
    expect(look(100)).toMatchObject({ family: 'bar', gold: 'bar' })
    expect(look(10000)).toMatchObject({ family: 'bar', gold: 'ingot' })
  })

  it('같은 조각이면 큰 단위가 더 크게', () => {
    const look = goldLook('allCoins')
    expect(look(100).scale).toBeGreaterThan(look(50).scale)
    expect(look(10000).scale).toBeGreaterThan(look(5000).scale)
  })

  it('모든 표가 모든 단위를 덮음', () => {
    for (const m of Object.values(GOLD_MAPS)) for (const d of DENOMS) expect(m.map[d]).toBeDefined()
  })

  it('직접 고르기: 고른 단위만 바꾸고 나머지는 기본 표', () => {
    expect(goldPieceFor(100, 'custom', { 100: 'dust' })[0]).toBe('dust')
    expect(goldPieceFor(10, 'custom', { 100: 'dust' })[0]).toBe('coin')
  })
})

describe('금 묶음', () => {
  it('골드바 10개 → 금고, 100개 → 큰 금고', () => {
    expect(packFor('bar')).toEqual({ pack: 10, crate: 100 })
    const look = goldLook('tenUp')
    const p = planPile(100 * 300, {
      mode: 'single',
      unit: 100,
      overflow: 'bundle',
      cap: 60,
      packOf: (d) => packFor(look(d).family),
    })
    const g = p.groups[0]
    expect(g.packs * 10 + g.loose + g.crates * 100).toBe(300)
    expect(g.packs + g.loose + g.crates).toBeLessThanOrEqual(60)
  })

  it('금화 100개 → 주머니', () => {
    expect(packFor('gcoin')).toEqual({ pack: 100, crate: 1000 })
  })
})
