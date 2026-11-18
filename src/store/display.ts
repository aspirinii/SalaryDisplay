import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { UpdateMode } from '../skins/digits'

export type SkinId = 'countup' | 'odometer'
export type PeriodKey = 'today' | 'week' | 'month'
export type LayoutId = 'stack' | 'hero'

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
}

export const defaultDisplay = (): DisplayOptions => ({
  skin: 'odometer',
  decimals: 2,
  updateMode: 'continuous',
  step: 100,
  layout: 'hero',
  heroPeriod: 'today',
})

function sanitizeDisplay(raw: unknown): DisplayOptions {
  const d = defaultDisplay()
  if (typeof raw !== 'object' || raw === null) return d
  const r = raw as Record<string, unknown>
  const pick = <T,>(v: unknown, allowed: readonly T[], fb: T): T => (allowed.includes(v as T) ? (v as T) : fb)
  return {
    skin: pick(r.skin, ['countup', 'odometer'] as const, d.skin),
    decimals: pick(r.decimals, [0, 1, 2, 3] as const, d.decimals),
    updateMode: pick(r.updateMode, ['continuous', 'second', 'step'] as const, d.updateMode),
    step: pick(r.step, [10, 100, 1000] as const, d.step),
    layout: pick(r.layout, ['stack', 'hero'] as const, d.layout),
    heroPeriod: pick(r.heroPeriod, ['today', 'week', 'month'] as const, d.heroPeriod),
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
