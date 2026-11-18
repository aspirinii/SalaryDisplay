import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { defaultSettings, sanitizeSettings, type DaySchedule, type Settings, type Weekday } from '../engine'

interface SettingsState {
  settings: Settings
  update: (patch: Partial<Settings>) => void
  setDay: (day: Weekday, schedule: DaySchedule) => void
  copyDay: (from: Weekday, to: Weekday[]) => void
  reset: () => void
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings(),
      update: (patch) => set((s) => ({ settings: sanitizeSettings({ ...s.settings, ...patch }) })),
      setDay: (day, schedule) =>
        set((s) => ({
          settings: sanitizeSettings({ ...s.settings, schedule: { ...s.settings.schedule, [day]: schedule } }),
        })),
      copyDay: (from, to) =>
        set((s) => {
          const schedule = { ...s.settings.schedule }
          for (const d of to) schedule[d] = clone(schedule[from])
          return { settings: sanitizeSettings({ ...s.settings, schedule }) }
        }),
      reset: () => set({ settings: defaultSettings() }),
    }),
    {
      name: 'salary-display:settings',
      version: 1,
      // localStorage가 막힌 환경(사생활 보호 모드 등)에서도 앱은 동작해야 함
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ settings: s.settings }),
      merge: (persisted, current) => ({
        ...current,
        settings: sanitizeSettings((persisted as { settings?: unknown } | undefined)?.settings),
      }),
    },
  ),
)
