/**
 * 화면 위젯 배치: 데이터 구조와 순수 조작 함수 (테스트 대상).
 * 배치는 자유 좌표가 아니라 "순서 + 크기(S/M/L)" 격자.
 */

import { DENOMS, recommendedUnit, type Arrange, type Denom, type MoneyMode, type Overflow } from '../pile/money'
import { GOLD_PIECES, GOLD_STYLES, type GoldMapId, type GoldPiece, type GoldStyle } from '../pile/gold'

export type WidgetType = 'counter' | 'progress' | 'status' | 'countdown' | 'clock' | 'pile'
export type WidgetSize = 'S' | 'M' | 'L'
export type PeriodKey = 'today' | 'week' | 'month' | 'year'
export type SkinId = 'countup' | 'odometer' | 'flip' | 'slot' | 'floating' | 'tank'

export const SKIN_IDS: readonly SkinId[] = ['odometer', 'countup', 'flip', 'slot', 'floating', 'tank']
export const WIDGET_TYPES: readonly WidgetType[] = ['counter', 'pile', 'progress', 'status', 'countdown', 'clock']
export const PERIODS: readonly PeriodKey[] = ['today', 'week', 'month', 'year']
export const SIZES: readonly WidgetSize[] = ['S', 'M', 'L']

export interface Widget {
  id: string
  type: WidgetType
  size: WidgetSize
  /** counter, progress */
  period?: PeriodKey
  /** counter: 없으면 전역 기본 스킨 */
  skin?: SkinId
  /** counter: 없으면 전역 소수점 */
  decimals?: 0 | 1 | 2 | 3
  /** counter, progress, pile: 라벨("오늘" 등) 표시. 기본 true */
  showLabel?: boolean
  /** pile: 돈 종류 */
  money?: MoneyMode
  /** pile: 한 가지 단위일 때 단위 (섞을 때는 가장 작은 단위) */
  unit?: Denom
  /** pile: 쌓는 방식 */
  arrange?: Arrange
  /** pile: 넘칠 때. 없으면 묶음 */
  overflow?: Overflow
  /** pile: 원화 / 황금. 없으면 원화 */
  material?: 'won' | 'gold'
  /** pile 황금: 단위 → 금 조각 바꾸기 표. 없으면 tenUp */
  goldMap?: GoldMapId
  /** pile 황금: goldMap = custom일 때 단위별 금 조각 */
  goldCustom?: Partial<Record<Denom, GoldPiece>>
  /** pile 황금: 금화 문양·바 각인. 없으면 꾸미기 기본값 */
  goldStyle?: GoldStyle
}

/** 기간이 있는 위젯 */
export const hasPeriod = (t: WidgetType) => t === 'counter' || t === 'progress' || t === 'pile'

export const WIDGET_INFO: Record<WidgetType, { name: string; description: string; icon: string }> = {
  counter: { name: '금액 카운터', description: '오늘·이번 주·이번 달·올해 번 돈', icon: '₩' },
  progress: { name: '진행 막대', description: '기간 전체 대비 진행률', icon: '▰' },
  status: { name: '상태', description: '근무 중/휴게/근무 외 + 초당 금액', icon: '●' },
  countdown: { name: '퇴근까지', description: '오늘 근무가 끝날 때까지 남은 시간', icon: '⏱' },
  clock: { name: '시계', description: '현재 시각과 날짜', icon: '🕘' },
  pile: { name: '돈 쌓기', description: '동전·지폐가 쌓이는 모습 (더미·차곡차곡·시간별 칸)', icon: '🪙' },
}

export const PERIOD_LABEL: Record<PeriodKey, string> = {
  today: '오늘',
  week: '이번 주',
  month: '이번 달',
  year: '올해',
}

export const SIZE_LABEL: Record<WidgetSize, string> = { S: '작게', M: '보통', L: '크게' }

let seq = 0
export function newId(): string {
  seq += 1
  return `w${Date.now().toString(36)}${seq.toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`
}

/** 새로 추가할 때 기본 모양 */
export function createWidget(type: WidgetType, patch: Partial<Widget> = {}): Widget {
  const base: Widget = { id: newId(), type, size: 'M' }
  if (type === 'counter') base.period = 'today'
  if (type === 'pile') {
    base.period = patch.period ?? 'today'
    base.size = 'L'
    base.money = 'single'
    base.unit = recommendedUnit(base.period)
    base.arrange = 'heap'
  }
  if (type === 'progress') {
    base.period = 'today'
    base.size = 'L'
  }
  return { ...base, ...patch }
}

/* ───────────── 배치 프리셋 ───────────── */

export type PresetId = 'hero' | 'three' | 'minimal' | 'tanks' | 'piggy' | 'hourly' | 'vault' | 'dashboard'

export const PRESETS: Record<PresetId, { name: string; description: string; build: () => Widget[] }> = {
  hero: {
    name: '하나 크게',
    description: '오늘을 크게, 주·월은 아래에',
    build: () => [
      createWidget('status', { size: 'S' }),
      createWidget('counter', { period: 'today', size: 'L' }),
      createWidget('counter', { period: 'week', size: 'M' }),
      createWidget('counter', { period: 'month', size: 'M' }),
      createWidget('progress', { period: 'today', size: 'L' }),
    ],
  },
  three: {
    name: '셋 나란히',
    description: '오늘·이번 주·이번 달을 같은 크기로',
    build: () => [
      createWidget('counter', { period: 'today', size: 'S' }),
      createWidget('counter', { period: 'week', size: 'S' }),
      createWidget('counter', { period: 'month', size: 'S' }),
      createWidget('progress', { period: 'today', size: 'L' }),
    ],
  },
  minimal: {
    name: '미니멀',
    description: '오늘 금액 하나만',
    build: () => [createWidget('counter', { period: 'today', size: 'L', showLabel: false })],
  },
  tanks: {
    name: '물통 대시보드',
    description: '기간별로 물이 차오름',
    build: () => [
      createWidget('counter', { period: 'today', size: 'L', skin: 'tank' }),
      createWidget('counter', { period: 'week', size: 'M', skin: 'tank' }),
      createWidget('counter', { period: 'month', size: 'M', skin: 'tank' }),
    ],
  },
  piggy: {
    name: '저금통',
    description: '오늘 500원 동전 더미 + 이번 달 만 원 차곡차곡',
    build: () => [
      createWidget('status', { size: 'S' }),
      createWidget('counter', { period: 'today', size: 'L' }),
      createWidget('pile', { period: 'today', size: 'L', unit: 500, arrange: 'heap' }),
      createWidget('pile', { period: 'month', size: 'L', unit: 10000, arrange: 'neat' }),
    ],
  },
  hourly: {
    name: '시간별',
    description: '근무 시간마다 칸에 천 원짜리가 쌓임',
    build: () => [
      createWidget('status', { size: 'S' }),
      createWidget('countdown', { size: 'S' }),
      createWidget('clock', { size: 'S' }),
      createWidget('pile', { period: 'today', size: 'L', unit: 1000, arrange: 'hourly' }),
      createWidget('counter', { period: 'today', size: 'M' }),
      createWidget('counter', { period: 'month', size: 'M' }),
    ],
  },
  vault: {
    name: '금고',
    description: '오늘 금화 더미 + 이번 달 골드바 피라미드 + 올해 금괴',
    build: () => [
      createWidget('status', { size: 'S' }),
      createWidget('counter', { period: 'today', size: 'L' }),
      createWidget('pile', { period: 'today', size: 'L', unit: 100, arrange: 'heap', material: 'gold', goldMap: 'allCoins' }),
      createWidget('pile', { period: 'month', size: 'M', unit: 10000, arrange: 'neat', material: 'gold', goldMap: 'coinBill' }),
      createWidget('pile', { period: 'year', size: 'M', unit: 10000, arrange: 'neat', material: 'gold' }),
    ],
  },
  dashboard: {
    name: '모니터용',
    description: '시계·상태·퇴근까지 + 큰 금액',
    build: () => [
      createWidget('clock', { size: 'S' }),
      createWidget('status', { size: 'S' }),
      createWidget('countdown', { size: 'S' }),
      createWidget('counter', { period: 'today', size: 'L', skin: 'flip' }),
      createWidget('counter', { period: 'month', size: 'M' }),
      createWidget('counter', { period: 'year', size: 'M' }),
      createWidget('progress', { period: 'today', size: 'L' }),
    ],
  },
}

export const defaultWidgets = (): Widget[] => PRESETS.hero.build()

/* ───────────── 조작 (모두 새 배열 반환) ───────────── */

export function moveWidget(list: Widget[], fromId: string, toId: string): Widget[] {
  const from = list.findIndex((w) => w.id === fromId)
  const to = list.findIndex((w) => w.id === toId)
  if (from < 0 || to < 0 || from === to) return list
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export function removeWidget(list: Widget[], id: string): Widget[] {
  return list.filter((w) => w.id !== id)
}

export function updateWidget(list: Widget[], id: string, patch: Partial<Omit<Widget, 'id'>>): Widget[] {
  return list.map((w) => {
    if (w.id !== id) return w
    const next = { ...w, ...patch }
    // undefined로 지운 항목은 키도 없앰 (저장 데이터 깔끔하게)
    for (const k of Object.keys(next) as (keyof Widget)[]) if (next[k] === undefined) delete next[k]
    return next
  })
}

export function addWidget(list: Widget[], widget: Widget): Widget[] {
  return [...list, widget]
}

/** 모서리 드래그: 격자 폭 대비 비율에 가장 가까운 크기 */
export function sizeFromRatio(ratio: number): WidgetSize {
  const options: [WidgetSize, number][] = [
    ['S', 1 / 3],
    ['M', 1 / 2],
    ['L', 1],
  ]
  let best = options[0]
  for (const o of options) if (Math.abs(ratio - o[1]) < Math.abs(ratio - best[1])) best = o
  return best[0]
}

/* ───────────── 저장값 검증 · 이전 버전 변환 ───────────── */

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const pick = <T,>(v: unknown, allowed: readonly T[]): T | undefined => (allowed.includes(v as T) ? (v as T) : undefined)

export function sanitizeWidget(raw: unknown): Widget | null {
  if (!isObj(raw)) return null
  const type = pick(raw.type, WIDGET_TYPES)
  if (!type) return null
  const w: Widget = {
    id: typeof raw.id === 'string' && raw.id ? raw.id : newId(),
    type,
    size: pick(raw.size, SIZES) ?? 'M',
  }
  if (hasPeriod(type)) w.period = pick(raw.period, PERIODS) ?? 'today'
  if (type === 'counter') {
    const skin = pick(raw.skin, SKIN_IDS)
    if (skin) w.skin = skin
    const decimals = pick(raw.decimals, [0, 1, 2, 3] as const)
    if (decimals !== undefined) w.decimals = decimals
  }
  if (type === 'pile') {
    w.money = pick(raw.money, ['single', 'mixed', 'coins', 'bills'] as const) ?? 'single'
    w.unit = pick(raw.unit, DENOMS) ?? recommendedUnit(w.period ?? 'today')
    w.arrange = pick(raw.arrange, ['heap', 'neat', 'hourly'] as const) ?? 'heap'
    // 시간별 칸은 오늘만
    if (w.arrange === 'hourly') w.period = 'today'
    const overflow = pick(raw.overflow, ['bundle', 'exchange', 'shrink'] as const)
    if (overflow && overflow !== 'bundle') w.overflow = overflow
    if (raw.material === 'gold') {
      w.material = 'gold'
      const map = pick(raw.goldMap, ['tenUp', 'coinBill', 'allCoins', 'custom'] as const)
      if (map && map !== 'tenUp') w.goldMap = map
      if (map === 'custom' && isObj(raw.goldCustom)) {
        const custom: Partial<Record<Denom, GoldPiece>> = {}
        for (const d of DENOMS) {
          const p = pick((raw.goldCustom as Record<string, unknown>)[d], GOLD_PIECES)
          if (p) custom[d] = p
        }
        w.goldCustom = custom
      }
      const style = pick(raw.goldStyle, GOLD_STYLES)
      if (style) w.goldStyle = style
    }
  }
  if (hasPeriod(type) && raw.showLabel === false) w.showLabel = false
  return w
}

export function sanitizeWidgets(raw: unknown): Widget[] | null {
  if (!Array.isArray(raw)) return null
  const seen = new Set<string>()
  const out: Widget[] = []
  for (const r of raw) {
    const w = sanitizeWidget(r)
    if (!w) continue
    if (seen.has(w.id)) w.id = newId()
    seen.add(w.id)
    out.push(w)
  }
  return out
}

/** 상태 위젯이 없으면 맨 앞에 추가 (예전엔 머리말에 있던 상태를 위젯으로 옮길 때) */
export function withStatusWidget(list: Widget[]): Widget[] {
  return list.some((w) => w.type === 'status') ? list : [createWidget('status', { size: 'S' }), ...list]
}

/**
 * v1 저장값(layout/heroPeriod/skin)을 위젯 목록으로.
 * v1 'hero' = 큰 카운터 + 나머지 둘 + 진행 막대, 'stack' = 셋 나란히(작게) + 진행 막대
 */
export function widgetsFromLegacy(raw: Record<string, unknown>): Widget[] {
  const all: PeriodKey[] = ['today', 'week', 'month']
  if (raw.layout === 'stack') {
    return [...all.map((p) => createWidget('counter', { period: p, size: 'S' })), createWidget('progress', { size: 'L' })]
  }
  const hero = pick(raw.heroPeriod, all) ?? 'today'
  return [
    createWidget('counter', { period: hero, size: 'L' }),
    ...all.filter((p) => p !== hero).map((p) => createWidget('counter', { period: p, size: 'M' })),
    createWidget('progress', { period: 'today', size: 'L' }),
  ]
}
