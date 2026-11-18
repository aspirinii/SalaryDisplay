import { useEffect, useState } from 'react'
import { snapshot } from './engine'
import { useSettings } from './store/settings'
import { useDisplay, type PeriodKey } from './store/display'
import { useNow } from './hooks/useNow'
import { useAppearance } from './hooks/useAppearance'
import { useMilestone } from './hooks/useMilestone'
import { useFullscreen, useIdle } from './hooks/useFullscreen'
import { SettingsPanel } from './components/SettingsPanel'
import { Counter } from './components/Counter'
import { won } from './format'
import css from './App.module.css'

const STATUS_LABEL = { working: '근무 중', break: '휴게 중', off: '근무 외' } as const
const PERIOD_LABEL: Record<PeriodKey, string> = { today: '오늘', week: '이번 주', month: '이번 달' }
const PERIODS: PeriodKey[] = ['today', 'week', 'month']

export default function App() {
  const settings = useSettings((s) => s.settings)
  const display = useDisplay((s) => s.display)
  const [settingsOpen, setSettingsOpen] = useState(false)
  useAppearance(display)
  const fullscreen = useFullscreen()
  const toggleFullscreen = fullscreen.toggle
  const idle = useIdle(fullscreen.active)

  // F 키로 전체화면 (입력 중이거나 설정이 열려 있으면 무시)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (settingsOpen || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement
      if (t.closest('input, select, textarea, [contenteditable]')) return
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        void toggleFullscreen()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [settingsOpen, toggleFullscreen])
  // 연속 모드만 매 프레임, 나머지는 초 단위 갱신 (CPU 절약)
  const now = useNow(display.updateMode === 'continuous' ? 'frame' : 'second')
  const snap = snapshot(settings, now)
  const milestone = useMilestone(snap.today, display.milestoneUnit, display.milestones)
  const hrs = Math.floor(snap.secondsUntilOff / 3600)
  const mins = Math.floor((snap.secondsUntilOff % 3600) / 60)

  const values: Record<PeriodKey, number> = { today: snap.today, week: snap.week, month: snap.month }
  const totals: Record<PeriodKey, number> = { today: snap.todayTotal, week: snap.weekTotal, month: snap.monthTotal }
  const progress = (p: PeriodKey) => (totals[p] > 0 ? values[p] / totals[p] : 0)
  const hero = display.layout === 'hero' ? display.heroPeriod : null
  const cards = PERIODS.filter((p) => p !== hero)
  const counterProps = { ratePerSecond: snap.ratePerSecond, status: snap.status, options: display }

  return (
    <main className={css.main} data-focus={fullscreen.active} data-idle={idle}>
      <header className={css.top}>
        <span className={css.status} data-status={snap.status}>
          {STATUS_LABEL[snap.status]}
          {snap.status !== 'off' && <span className={css.rate}>+{won(snap.ratePerSecond, 2)}/초</span>}
        </span>
        <span className={css.actions}>
          <button
            className={css.gear}
            onClick={() => void fullscreen.toggle()}
            aria-label={fullscreen.active ? '전체화면 끝내기' : '전체화면'}
            title="전체화면 (F)"
          >
            {fullscreen.active ? '⤡ 나가기' : '⛶ 전체화면'}
          </button>
          <button className={css.gear} onClick={() => setSettingsOpen(true)} aria-label="설정 열기">
            ⚙︎ 설정
          </button>
        </span>
      </header>

      {hero && (
        <section className={css.hero} data-celebrate={milestone !== null && hero === 'today'}>
          <div className={css.label}>{PERIOD_LABEL[hero]}</div>
          <Counter value={values[hero]} progress={progress(hero)} size="hero" {...counterProps} />
        </section>
      )}

      <div className={css.cards} data-layout={display.layout}>
        {cards.map((p) => (
          <section key={p} className={css.card} data-celebrate={milestone !== null && p === 'today'}>
            <div className={css.label}>{PERIOD_LABEL[p]}</div>
            <Counter value={values[p]} progress={progress(p)} size="card" {...counterProps} />
          </section>
        ))}
      </div>

      <div className={css.progress} aria-label="오늘 진행률">
        <div style={{ width: `${snap.todayProgress * 100}%` }} />
      </div>
      <p className={css.meta}>
        오늘 {(snap.todayProgress * 100).toFixed(1)}% / {won(snap.todayTotal)}
        {snap.secondsUntilOff > 0 && ` · 퇴근까지 ${hrs}시간 ${mins}분`}
      </p>

      {milestone !== null && (
        <div className={css.toast} role="status" key={milestone}>
          🎉 오늘 {won(milestone)} 돌파!
        </div>
      )}
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  )
}
