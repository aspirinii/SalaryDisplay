import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { UpdateMode } from '../skins/digits'

export type SkinId = 'countup' | 'odometer' | 'flip' | 'slot' | 'floating' | 'tank'
export type PeriodKey = 'today' | 'week' | 'month'
export type LayoutId = 'stack' | 'hero'
export type ThemeId = 'system' | 'dark' | 'light' | 'contrast'
export type AccentId = 'default' | 'blue' | 'gold' | 'pink' | 'purple' | 'red'
export type FontId = 'system' | 'mono' | 'rounded' | 'serif'

export interface DisplayOptions {
  skin: SkinId
  /** 소수점 자리수 */
  decimals: 0 | 1 | 2 | 3
  updateMode: UpdateMode
  /** updateMode = 'step'일 때 단위 (원) */
  step: 10 | 100 | 1000
  layout: LayoutId
  /** layout = 'hero'일 때 크게 보여줄 기간 */
  heroPeriod: PeriodKey
  theme: ThemeId
  accent: AccentId
  font: FontId
  /** 오늘 금액이 단위를 넘을 때 축하 표시 */
  milestones: boolean
  milestoneUnit: 10_000 | 50_000 | 100_000
}

export const defaultDisplay = (): DisplayOptions => ({
  skin: 'odometer',
  decimals: 2,
  updateMode: 'continuous',
  step: 100,
  layout: 'hero',
  heroPeriod: 'today',
  theme: 'system',
  accent: 'default',
  font: 'system',
  milestones: true,
  milestoneUnit: 10_000,
})

/** 'default'는 테마 기본 강조색. 나머지는 밝은/어두운 배경 모두에서 읽히는 중간 채도 */
export const ACCENTS: Record<AccentId, { label: string; color: string | null }> = {
  default: { label: '초록', color: null },
  blue: { label: '파랑', color: '#3b82f6' },
  gold: { label: '금색', color: '#d99a0b' },
  pink: { label: '분홍', color: '#e5488f' },
  purple: { label: '보라', color: '#8b5cf6' },
  red: { label: '빨강', color: '#e5484d' },
}

export const FONTS: Record<FontId, { label: string; stack: string | null }> = {
  system: { label: '기본', stack: null },
  mono: { label: '고정폭', stack: "ui-monospace, 'SF Mono', Menlo, monospace" },
  rounded: { label: '둥근', stack: "ui-rounded, 'SF Pro Rounded', system-ui, sans-serif" },
  serif: { label: '세리프', stack: "ui-serif, 'New York', Georgia, serif" },
}

function sanitizeDisplay(raw: unknown): DisplayOptions {
  const d = defaultDisplay()
  if (typeof raw !== 'object' || raw === null) return d
  const r = raw as Record<string, unknown>
  const pick = <T,>(v: unknown, allowed: readonly T[], fb: T): T => (allowed.includes(v as T) ? (v as T) : fb)
  return {
    skin: pick(r.skin, ['countup', 'odometer', 'flip', 'slot', 'floating', 'tank'] as const, d.skin),
    decimals: pick(r.decimals, [0, 1, 2, 3] as const, d.decimals),
    updateMode: pick(r.updateMode, ['continuous', 'second', 'step'] as const, d.updateMode),
    step: pick(r.step, [10, 100, 1000] as const, d.step),
    layout: pick(r.layout, ['stack', 'hero'] as const, d.layout),
    heroPeriod: pick(r.heroPeriod, ['today', 'week', 'month'] as const, d.heroPeriod),
    theme: pick(r.theme, ['system', 'dark', 'light', 'contrast'] as const, d.theme),
    accent: pick(r.accent, Object.keys(ACCENTS) as AccentId[], d.accent),
    font: pick(r.font, Object.keys(FONTS) as FontId[], d.font),
    milestones: typeof r.milestones === 'boolean' ? r.milestones : d.milestones,
    milestoneUnit: pick(r.milestoneUnit, [10_000, 50_000, 100_000] as const, d.milestoneUnit),
  }
}

interface DisplayState {
  display: DisplayOptions
  updateDisplay: (patch: Partial<DisplayOptions>) => void
}

export const useDisplay = create<DisplayState>()(
  persist(
    (set) => ({
      display: defaultDisplay(),
      updateDisplay: (patch) => set((s) => ({ display: sanitizeDisplay({ ...s.display, ...patch }) })),
    }),
    {
      name: 'salary-display:display',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ display: s.display }),
      merge: (persisted, current) => ({
        ...current,
        display: sanitizeDisplay((persisted as { display?: unknown } | undefined)?.display),
      }),
    },
  ),
)
