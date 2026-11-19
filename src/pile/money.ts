/**
 * 돈 쌓기 위젯의 계산 (순수 함수, 테스트 대상).
 * 쌓인 모습도 금액에서 매번 다시 계산 — 누적하지 않음.
 */
import { dayPeriod, earnedBetween, shiftsBetween, type Settings } from '../engine'
import type { PeriodKey } from '../layout/widgets'

export type Denom = 10 | 50 | 100 | 500 | 1000 | 5000 | 10000
export const DENOMS: readonly Denom[] = [10, 50, 100, 500, 1000, 5000, 10000]
export const COINS: readonly Denom[] = [10, 50, 100, 500]
export const BILLS: readonly Denom[] = [1000, 5000, 10000]
export const isCoin = (d: Denom) => d < 1000

/** single = 한 가지 단위, mixed = 거스름돈처럼 큰 단위부터, coins/bills = 동전만·지폐만 섞기 */
export type MoneyMode = 'single' | 'mixed' | 'coins' | 'bills'
export type Arrange = 'heap' | 'neat' | 'hourly'
export type Overflow = 'bundle' | 'exchange' | 'shrink'

export const MONEY_LABEL: Record<MoneyMode, string> = {
  single: '한 가지 단위',
  mixed: '섞어서',
  coins: '동전만 섞기',
  bills: '지폐만 섞기',
}
export const ARRANGE_LABEL: Record<Arrange, string> = { heap: '마구잡이 더미', neat: '차곡차곡', hourly: '시간별 칸' }
export const OVERFLOW_LABEL: Record<Overflow, string> = { bundle: '묶음', exchange: '자동 환전', shrink: '줄여 보기' }
export const denomLabel = (d: Denom) => (d >= 10000 ? `${d / 10000}만 원` : `${d.toLocaleString('ko-KR')}원`)

/** 기간에 어울리는 기본 단위 (너무 많지도, 너무 드물지도 않게) */
export function recommendedUnit(period: PeriodKey): Denom {
  if (period === 'today') return 500
  if (period === 'week') return 5000
  return 10000
}

/**
 * 쓰는 단위들, 큰 것부터.
 * 섞을 때(mixed·coins)는 unit이 "가장 작은 단위" (지폐를 골랐으면 100원부터).
 */
export function denomsFor(mode: MoneyMode, unit: Denom): Denom[] {
  const smallest = isCoin(unit) ? unit : 100
  const list =
    mode === 'single'
      ? [unit]
      : mode === 'bills'
        ? BILLS
        : (mode === 'coins' ? COINS : DENOMS).filter((d) => d >= smallest)
  return [...list].sort((a, b) => b - a)
}

export type Counts = Partial<Record<Denom, number>>

export interface Breakdown {
  /** 단위별 개수 */
  counts: Counts
  /** 가장 작은 단위 다음 1개 (0~1) */
  next: number
  /** 다음에 생길 단위 */
  nextDenom: Denom
}

/** 금액 → 단위별 개수. 섞을 때는 큰 단위부터 (거스름돈 방식) */
export function breakdown(amount: number, denoms: readonly Denom[]): Breakdown {
  const sorted = [...denoms].sort((a, b) => b - a)
  let rest = Math.max(0, amount)
  const counts: Counts = {}
  for (const d of sorted) {
    const n = Math.floor(rest / d + 1e-9)
    if (n > 0) counts[d] = n
    rest -= n * d
  }
  const smallest = sorted[sorted.length - 1]
  return { counts, next: Math.min(1, Math.max(0, rest / smallest)), nextDenom: smallest }
}

export const totalPieces = (c: Counts) => DENOMS.reduce((s, d) => s + (c[d] ?? 0), 0)

/** 묶음 크기: 동전 50개 = 롤, 1,000개 = 자루 / 지폐 100장 = 띠지 다발, 1,000장 = 큰 다발 */
export const PACK: Record<'coin' | 'bill', { pack: number; crate: number }> = {
  coin: { pack: 50, crate: 1000 },
  bill: { pack: 100, crate: 1000 },
}

export type UnitKind = 'loose' | 'pack' | 'crate'
export interface Group {
  denom: Denom
  crates: number
  packs: number
  loose: number
}

/**
 * 그릴 개수가 cap을 넘지 않게 묶음으로 합침.
 * 낱개를 최대한 남기도록 필요한 만큼만 묶음 (롤 → 그래도 넘치면 자루).
 */
export function bundle(denom: Denom, n: number, cap: number): Group {
  const { pack, crate } = PACK[isCoin(denom) ? 'coin' : 'bill']
  const packsOnly = (m: number, budget: number): { packs: number; loose: number } | null => {
    if (m <= budget) return { packs: 0, loose: m }
    const packs = Math.min(Math.ceil((m - budget) / (pack - 1)), Math.floor(m / pack))
    const loose = m - packs * pack
    return packs <= budget / 2 && packs + loose <= budget ? { packs, loose } : null
  }
  const simple = packsOnly(n, cap)
  if (simple) return { denom, crates: 0, ...simple }
  for (let crates = 1; crates * crate <= n; crates++) {
    const rest = packsOnly(n - crates * crate, cap - crates)
    if (rest) return { denom, crates, ...rest }
  }
  const crates = Math.floor(n / crate)
  return { denom, crates, packs: Math.floor((n % crate) / pack), loose: n % pack }
}

export const groupItems = (g: Group) => g.crates + g.packs + g.loose

export interface PileOptions {
  mode: MoneyMode
  unit: Denom
  overflow: Overflow
  /** 그릴 수 있는 최대 개수 */
  cap: number
}

export interface PilePlan {
  groups: Group[]
  /** 줄여 보기: 조각 크기 배율 (1 = 원래 크기) */
  scale: number
  breakdown: Breakdown
}

/** 그릴 수 있는 최대 개수 (줄여 보기여도 이 이상은 묶음) */
export const HARD_CAP = 1500

/** 금액 → 실제로 그릴 묶음 목록 */
export function planPile(amount: number, opt: PileOptions): PilePlan {
  let b = breakdown(amount, denomsFor(opt.mode, opt.unit))
  let scale = 1
  let cap = opt.cap
  const n = totalPieces(b.counts)
  if (n > opt.cap) {
    if (opt.overflow === 'exchange' && opt.mode !== 'mixed') {
      // 고른 단위 이상으로 바꿔 줌 (작은 단위 다음 1개 표시는 그대로)
      const min = Math.min(...denomsFor(opt.mode, opt.unit))
      const ex = breakdown(amount, DENOMS.filter((d) => d >= min))
      b = { ...ex, next: b.next, nextDenom: b.nextDenom }
    } else if (opt.overflow === 'shrink') {
      cap = Math.min(n, HARD_CAP)
      scale = Math.max(0.3, Math.sqrt(opt.cap / cap) * 0.85)
    }
  }
  const denoms = DENOMS.filter((d) => (b.counts[d] ?? 0) > 0).sort((a, c) => c - a)
  // cap 나누기: 개수가 적은 단위부터 필요한 만큼, 남는 것은 많은 단위에
  const budget = new Map<Denom, number>()
  let left = cap
  const byCount = [...denoms].sort((a, c) => (b.counts[a] ?? 0) - (b.counts[c] ?? 0))
  byCount.forEach((d, i) => {
    const fair = Math.floor(left / (byCount.length - i))
    const give = Math.max(4, Math.min(b.counts[d] ?? 0, fair))
    budget.set(d, give)
    left -= give
  })
  const groups = denoms.map((d) => bundle(d, b.counts[d] ?? 0, budget.get(d) ?? 4))
  return { groups, scale, breakdown: b }
}

/* ───────────── 시간별 칸 ───────────── */

export interface HourSlot {
  /** 칸 시작 시각 (ms) */
  start: number
  end: number
  /** "9시" */
  label: string
  /** 지금까지 이 칸에서 번 금액 */
  amount: number
  /** 오늘 이 칸 전까지 번 금액 */
  before: number
  /** 이 칸 전체 금액 (근무를 다 하면) — 0이면 쉬는 칸 */
  total: number
  state: 'past' | 'now' | 'future'
}

const HOUR = 3600_000

/** 오늘 근무 시간을 정시 단위 칸으로 나눔 (9:00~18:00 → 9칸) */
export function hourlySlots(settings: Settings, now: Date): HourSlot[] {
  const day = dayPeriod(now)
  const shifts = shiftsBetween(settings, day.start, day.end)
  if (shifts.length === 0) return []
  const from = Math.max(day.start, Math.min(...shifts.map((s) => s.shift.start)))
  const to = Math.min(day.end, Math.max(...shifts.map((s) => s.shift.end)))
  if (to <= from) return []
  const t = now.getTime()
  const first = new Date(from)
  first.setMinutes(0, 0, 0)
  const slots: HourSlot[] = []
  let before = earnedBetween(settings, day.start, Math.max(day.start, first.getTime()))
  for (let s = first.getTime(); s < to; s += HOUR) {
    const start = Math.max(s, from)
    const end = Math.min(s + HOUR, to)
    const total = earnedBetween(settings, start, end)
    const amount = t <= start ? 0 : t >= end ? total : earnedBetween(settings, start, t)
    slots.push({
      start,
      end,
      label: `${new Date(s).getHours()}시`,
      amount,
      before,
      total,
      state: t >= end ? 'past' : t >= start ? 'now' : 'future',
    })
    before += total
  }
  return slots
}

/**
 * 칸에 쌓일 금액: 오늘 전체에서 이 시간 동안 "새로 생긴" 조각만큼.
 * 칸마다 따로 세면 정각마다 다음 1개가 처음부터 다시 시작돼 다른 위젯과 어긋남.
 */
export function slotValue(slot: Pick<HourSlot, 'before' | 'amount'>, smallest: Denom): number {
  const made = (v: number) => Math.floor(v / smallest + 1e-9)
  return (made(slot.before + slot.amount) - made(slot.before)) * smallest
}
