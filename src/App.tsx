import { useState } from 'react'
import { snapshot } from './engine'
import { useSettings } from './store/settings'
import { useDisplay, type PeriodKey } from './store/display'
import { useNow } from './hooks/useNow'
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
  // 연속 모드만 매 프레임, 나머지는 초 단위 갱신 (CPU 절약)
  const now = useNow(display.updateMode === 'continuous' ? 'frame' : 'second')
  const snap = snapshot(settings, now)
  const hrs = Math.floor(snap.secondsUntilOff / 3600)
  const mins = Math.floor((snap.secondsUntilOff % 3600) / 60)

  const values: Record<PeriodKey, number> = { today: snap.today, week: snap.week, month: snap.month }
  const hero = display.layout === 'hero' ? display.heroPeriod : null
  const cards = PERIODS.filter((p) => p !== hero)
  const counterProps = { ratePerSecond: snap.ratePerSecond, status: snap.status, options: display }

  return (
    <main className={css.main}>
      <header className={css.top}>
        <span className={css.status} data-status={snap.status}>
          {STATUS_LABEL[snap.status]}
          {snap.status !== 'off' && <span className={css.rate}>+{won(snap.ratePerSecond, 2)}/초</span>}
        </span>
        <button className={css.gear} onClick={() => setSettingsOpen(true)} aria-label="설정 열기">
          ⚙︎ 설정
        </button>
      </header>

      {hero && (
        <section className={css.hero}>
          <div className={css.label}>{PERIOD_LABEL[hero]}</div>
          <Counter value={values[hero]} size="hero" {...counterProps} />
        </section>
      )}

      <div className={css.cards} data-layout={display.layout}>
        {cards.map((p) => (
          <section key={p} className={css.card}>
            <div className={css.label}>{PERIOD_LABEL[p]}</div>
            <Counter value={values[p]} size="card" {...counterProps} />
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
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  )
}
