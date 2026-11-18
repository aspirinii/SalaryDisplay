/**
 * 숫자 표현용 순수 함수 (테스트 대상).
 */

export type UpdateMode = 'continuous' | 'second' | 'step'

/** 'step' 모드: step 단위로 내림. 그 외는 그대로. */
export function quantize(value: number, mode: UpdateMode, step: number): number {
  if (mode !== 'step' || step <= 0) return value
  return Math.floor(value / step + 1e-9) * step
}

/**
 * 주행거리계 바퀴 위치. 각 자리의 값은 0 이상 10 미만 실수.
 * 10에 가까울수록 다음 숫자(9 → 0)로 굴러가는 중.
 *
 * - 가장 낮은 자리: 너무 빨리 바뀌면(초당 3번 초과) 정수로 끊어 표시, 아니면 연속 회전
 * - 윗자리: 아랫자리가 9를 넘어 굴러가는 만큼만 같이 굴러감 (기계식 주행거리계)
 *
 * @returns 높은 자리부터. intCount개는 정수부, 나머지 decimals개는 소수부.
 */
export function odometerWheels(
  value: number,
  decimals: number,
  ratePerSecond: number,
  minIntDigits = 1,
): { wheels: number[]; intCount: number } {
  const v = Math.max(0, value)
  const intCount = Math.max(minIntDigits, v >= 1 ? Math.floor(Math.log10(v)) + 1 : 1)
  const wheels: number[] = []
  // 바로 아랫자리의 "실제" 연속 위치. 최하위 자리를 끊어 표시해도
  // 윗자리는 이 값으로 9 → 0 넘어가는 순간 부드럽게 굴러감
  let lower = 0
  for (let p = -decimals; p < intCount; p++) {
    const scaled = v / 10 ** p
    let pos: number
    if (p === -decimals) {
      const continuous = scaled % 10
      const digitsPerSecond = ratePerSecond / 10 ** p
      pos = digitsPerSecond > 3 ? Math.floor(scaled + 1e-9) % 10 : continuous
      lower = continuous
    } else {
      pos = (Math.floor(scaled + 1e-9) % 10) + Math.max(0, lower - 9)
      lower = pos
    }
    wheels.push(pos)
  }
  return { wheels: wheels.reverse(), intCount }
}

export interface DigitChar {
  ch: string
  /** 숫자면 자리(10^place), 쉼표·점이면 null */
  place: number | null
  /** 자리가 초당 3번 넘게 바뀌면 true → 애니메이션 생략 */
  fast: boolean
}

/** 금액을 "1,234.56" 형식 글자로 나누고, 각 숫자에 자릿값을 붙임 */
export function digitChars(value: number, decimals: number, ratePerSecond: number): DigitChar[] {
  const text = Math.max(0, value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  const dot = text.indexOf('.')
  const intDigits = (dot === -1 ? text : text.slice(0, dot)).replace(/,/g, '').length
  let intSeen = 0
  let fracSeen = 0
  let inFrac = false
  return [...text].map((ch) => {
    if (ch === '.') {
      inFrac = true
      return { ch, place: null, fast: false }
    }
    if (ch === ',') return { ch, place: null, fast: false }
    const place = inFrac ? -++fracSeen : intDigits - 1 - intSeen++
    return { ch, place, fast: ratePerSecond / 10 ** place > 3 }
  })
}
