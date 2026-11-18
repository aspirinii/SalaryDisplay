import { describe, expect, it } from 'vitest'
import { digitChars, odometerWheels, quantize } from './digits'

describe('quantize', () => {
  it('step 모드는 단위로 내림', () => {
    expect(quantize(12_345.67, 'step', 100)).toBe(12_300)
    expect(quantize(12_345.67, 'step', 10)).toBe(12_340)
    expect(quantize(99.999, 'step', 10)).toBe(90)
  })
  it('다른 모드는 그대로', () => {
    expect(quantize(12_345.67, 'continuous', 100)).toBe(12_345.67)
    expect(quantize(12_345.67, 'second', 100)).toBe(12_345.67)
  })
})

describe('odometerWheels', () => {
  const round = (xs: number[]) => xs.map((x) => Math.round(x * 1000) / 1000)

  it('정수 자리 분해', () => {
    expect(odometerWheels(1234, 0, 0)).toEqual({ wheels: [1, 2, 3, 4], intCount: 4 })
    expect(odometerWheels(0, 0, 0)).toEqual({ wheels: [0], intCount: 1 })
    expect(odometerWheels(5, 0, 0, 3).wheels).toEqual([0, 0, 5])
  })

  it('느린 최하위 자리는 연속 회전', () => {
    // 초당 0.5원 → 1원 자리 초당 0.5칸 → 연속
    const { wheels } = odometerWheels(1234.5, 0, 0.5)
    expect(round(wheels)).toEqual([1, 2, 3, 4.5])
  })

  it('빠른 최하위 자리는 정수로 끊음', () => {
    // 초당 5원 → 1원 자리 초당 5칸 → 끊어서
    expect(odometerWheels(1234.5, 0, 5).wheels).toEqual([1, 2, 3, 4])
  })

  it('최하위 자리를 끊어도 윗자리는 9→0 넘어갈 때 굴러감', () => {
    const { wheels } = odometerWheels(1239.5, 0, 5)
    expect(round(wheels)).toEqual([1, 2, 3.5, 9])
  })

  it('9를 넘어 굴러가면 윗자리도 같이 굴러감', () => {
    const { wheels } = odometerWheels(1299.5, 0, 0.5)
    expect(round(wheels)).toEqual([1, 2.5, 9.5, 9.5])
    const half = odometerWheels(1289.5, 0, 0.5)
    expect(round(half.wheels)).toEqual([1, 2, 8.5, 9.5])
  })

  it('소수 자리 포함', () => {
    const { wheels, intCount } = odometerWheels(12.34, 2, 0.01)
    expect(intCount).toBe(2)
    expect(round(wheels)).toEqual([1, 2, 3, 4])
  })
})

describe('digitChars', () => {
  it('자릿값과 빠른 자리 표시', () => {
    const chars = digitChars(1234.56, 2, 5)
    expect(chars.map((c) => c.ch).join('')).toBe('1,234.56')
    expect(chars.map((c) => c.place)).toEqual([3, null, 2, 1, 0, null, -1, -2])
    // 초당 5원: 1원 자리 이하는 빠름, 10원 자리부터는 느림
    expect(chars.filter((c) => c.fast).map((c) => c.place)).toEqual([0, -1, -2])
  })
})
