import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { UpdateMode } from '../skins/digits'
import {
  defaultWidgets,
  sanitizeWidgets,
  SKIN_IDS,
  widgetsFromLegacy,
  withStatusWidget,
  type SkinId,
  type Widget,
} from '../layout/widgets'

export type { SkinId, PeriodKey } from '../layout/widgets'
export type ThemeId = 'system' | 'dark' | 'light' | 'contrast'
export type AccentId = 'default' | 'mono' | 'silver' | 'gray' | 'blue' | 'gold' | 'pink' | 'purple' | 'red'
export type FontId = 'system' | 'mono' | 'rounded' | 'serif'

/** 축하 단위 (원) */
export const MILESTONE_UNITS = [100, 1_000, 10_000, 50_000, 100_000] as const
export type MilestoneUnit = (typeof MILESTONE_UNITS)[number]

export interface DisplayOptions {
  /** 화면 위젯 배치 (순서 = 표시 순서) */
  widgets: Widget[]
  /** 위젯에 스킨 지정이 없을 때 */
  defaultSkin: SkinId
  /** 위젯에 소수점 지정이 없을 때 */
  decimals: 0 | 1 | 2 | 3
  updateMode: UpdateMode
  /** updateMode = 'step'일 때 단위 (원) */
  step: 10 | 100 | 1000
  theme: ThemeId
  accent: AccentId
  font: FontId
  /** 오늘 금액이 단위를 넘을 때 축하 표시 */
  milestones: boolean
  milestoneUnit: MilestoneUnit
  /** 돈 쌓기: 떨어지는 애니메이션 */
  pileDrop: boolean
  /** 돈 쌓기: 짤랑·사락 소리 */
  pileSound: boolean
  /** 돈 쌓기: 동전·지폐 색 — 원래 색 / 강조색 맞춤 */
  pileColor: 'real' | 'accent'
  /** 첫 실행 안내를 마쳤거나 건너뜀 */
  onboarded: boolean
}

export const defaultDisplay = (): DisplayOptions => ({
  widgets: defaultWidgets(),
  defaultSkin: 'odometer',
  decimals: 2,
  updateMode: 'continuous',
  step: 100,
  theme: 'system',
  accent: 'default',
  font: 'system',
  milestones: true,
  milestoneUnit: 10_000,
  pileDrop: true,
  pileSound: false,
  pileColor: 'real',
  onboarded: false,
})

/**
 * 강조색. dark/light = 각 배경에서 쓸 색 (null = 테마 기본색).
 * 무채색은 배경에 따라 밝기를 바꿔야 읽힘.
 */
export const ACCENTS: Record<AccentId, { label: string; dark: string | null; light: string | null; neutral?: boolean }> = {
  default: { label: '초록', dark: null, light: null },
  mono: { label: '모노 (흰/검)', dark: '#f2f2f2', light: '#1a1a1a', neutral: true },
  silver: { label: '은색', dark: '#c8c8c8', light: '#6e6e6e', neutral: true },
  gray: { label: '회색', dark: '#9a9a9a', light: '#8a8a8a', neutral: true },
  blue: { label: '파랑', dark: '#5b9bff', light: '#2f6fe0' },
  gold: { label: '금색', dark: '#f0b429', light: '#b7790b' },
  pink: { label: '분홍', dark: '#f06aa8', light: '#d6337f' },
  purple: { label: '보라', dark: '#a78bfa', light: '#7c4dff' },
  red: { label: '빨강', dark: '#ff6b6b', light: '#d93636' },
}

export const FONTS: Record<FontId, { label: string; stack: string | null }> = {
  system: { label: '기본', stack: null },
  mono: { label: '고정폭', stack: "ui-monospace, 'SF Mono', Menlo, monospace" },
  rounded: { label: '둥근', stack: "ui-rounded, 'SF Pro Rounded', system-ui, sans-serif" },
  serif: { label: '세리프', stack: "ui-serif, 'New York', Georgia, serif" },
}

export function sanitizeDisplay(raw: unknown): DisplayOptions {
  const d = defaultDisplay()
  if (typeof raw !== 'object' || raw === null) return d
  const r = raw as Record<string, unknown>
  const pick = <T,>(v: unknown, allowed: readonly T[], fb: T): T => (allowed.includes(v as T) ? (v as T) : fb)
  // v1(위젯 없음, layout 있음) → 위젯 목록으로 변환. 이전 사용자는 안내도 건너뜀
  const legacy = !Array.isArray(r.widgets) && ('layout' in r || 'skin' in r)
  const widgets = legacy ? widgetsFromLegacy(r) : (sanitizeWidgets(r.widgets) ?? d.widgets)
  return {
    widgets,
    defaultSkin: pick(legacy ? r.skin : r.defaultSkin, SKIN_IDS, d.defaultSkin),
    decimals: pick(r.decimals, [0, 1, 2, 3] as const, d.decimals),
    updateMode: pick(r.updateMode, ['continuous', 'second', 'step'] as const, d.updateMode),
    step: pick(r.step, [10, 100, 1000] as const, d.step),
    theme: pick(r.theme, ['system', 'dark', 'light', 'contrast'] as const, d.theme),
    accent: pick(r.accent, Object.keys(ACCENTS) as AccentId[], d.accent),
    font: pick(r.font, Object.keys(FONTS) as FontId[], d.font),
    milestones: typeof r.milestones === 'boolean' ? r.milestones : d.milestones,
    milestoneUnit: pick(r.milestoneUnit, MILESTONE_UNITS, d.milestoneUnit),
    pileDrop: typeof r.pileDrop === 'boolean' ? r.pileDrop : d.pileDrop,
    pileSound: r.pileSound === true,
    pileColor: pick(r.pileColor, ['real', 'accent'] as const, d.pileColor),
    onboarded: legacy || r.onboarded === true,
  }
}

interface DisplayState {
  display: DisplayOptions
  updateDisplay: (patch: Partial<DisplayOptions>) => void
  setWidgets: (widgets: Widget[]) => void
}

export const useDisplay = create<DisplayState>()(
  persist(
    (set) => ({
      display: defaultDisplay(),
      updateDisplay: (patch) => set((s) => ({ display: sanitizeDisplay({ ...s.display, ...patch }) })),
      setWidgets: (widgets) => set((s) => ({ display: sanitizeDisplay({ ...s.display, widgets }) })),
    }),
    {
      name: 'salary-display:display',
      version: 3,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ display: s.display }),
      // 모양 변환은 sanitizeDisplay가 처리.
      // v3: 머리말의 상태(근무 중 · +₩/초)가 위젯으로 옮겨감 → 기존 화면에 상태 위젯 추가
      migrate: (persisted, version) => {
        const display = sanitizeDisplay((persisted as { display?: unknown } | undefined)?.display)
        if (version < 3) display.widgets = withStatusWidget(display.widgets)
        return { display }
      },
      merge: (persisted, current) => ({
        ...current,
        display: sanitizeDisplay((persisted as { display?: unknown } | undefined)?.display),
      }),
    },
  ),
)
