import type { EarningsSnapshot } from '../engine'
import { Counter } from '../components/Counter'
import { won } from '../format'
import { PERIOD_LABEL, type PeriodKey, type Widget } from '../layout/widgets'
import type { DisplayOptions } from '../store/display'
import css from './widgets.module.css'

/** 모든 위젯이 공유하는 실시간 데이터 */
export interface Live {
  snap: EarningsSnapshot
  now: Date
  display: DisplayOptions
  /** 축하 중인 금액 (오늘 카운터 반짝임) */
  milestone: number | null
}

const STATUS_LABEL = { working: '근무 중', break: '휴게 중', off: '근무 외' } as const

function periodValue(snap: EarningsSnapshot, p: PeriodKey): { value: number; total: number } {
  switch (p) {
    case 'today':
      return { value: snap.today, total: snap.todayTotal }
    case 'week':
      return { value: snap.week, total: snap.weekTotal }
    case 'month':
      return { value: snap.month, total: snap.monthTotal }
    case 'year':
      return { value: snap.year, total: snap.yearTotal }
  }
}

const hms = (secs: number) => {
  const s = Math.max(0, Math.floor(secs))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export function WidgetView({ widget, live }: { widget: Widget; live: Live }) {
  switch (widget.type) {
    case 'counter':
      return <CounterWidget widget={widget} live={live} />
    case 'progress':
      return <ProgressWidget widget={widget} live={live} />
    case 'status':
      return <StatusWidget live={live} />
    case 'countdown':
      return <CountdownWidget live={live} />
    case 'clock':
      return <ClockWidget live={live} />
  }
}

function CounterWidget({ widget, live }: { widget: Widget; live: Live }) {
  const period = widget.period ?? 'today'
  const { value, total } = periodValue(live.snap, period)
  const options = {
    ...live.display,
    skin: widget.skin ?? live.display.defaultSkin,
    decimals: widget.decimals ?? live.display.decimals,
  }
  const big = widget.size === 'L'
  return (
    <div
      className={css.counter}
      data-plain={big}
      data-celebrate={live.milestone !== null && period === 'today'}
    >
      {widget.showLabel !== false && <div className={css.label}>{PERIOD_LABEL[period]}</div>}
      <Counter
        value={value}
        progress={total > 0 ? value / total : 0}
        ratePerSecond={live.snap.ratePerSecond}
        status={live.snap.status}
        options={options}
        size={big ? 'hero' : 'card'}
      />
    </div>
  )
}

function ProgressWidget({ widget, live }: { widget: Widget; live: Live }) {
  const period = widget.period ?? 'today'
  const { value, total } = periodValue(live.snap, period)
  const pct = total > 0 ? Math.min(1, value / total) : 0
  const off = live.snap.secondsUntilOff
  return (
    <div className={css.progressWrap}>
      <div className={css.bar} role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-label={`${PERIOD_LABEL[period]} 진행률`}>
        <div style={{ width: `${pct * 100}%` }} />
      </div>
      <p className={css.meta}>
        {widget.showLabel !== false && `${PERIOD_LABEL[period]} `}
        {(pct * 100).toFixed(1)}% / {won(total)}
        {period === 'today' && off > 0 && ` · 퇴근까지 ${Math.floor(off / 3600)}시간 ${Math.floor((off % 3600) / 60)}분`}
      </p>
    </div>
  )
}

function StatusWidget({ live }: { live: Live }) {
  const { status, ratePerSecond } = live.snap
  return (
    <div className={css.box}>
      <div className={css.status} data-status={status}>
        {STATUS_LABEL[status]}
      </div>
      <div className={css.sub}>{status === 'off' ? '지금은 쌓이지 않음' : `+${won(ratePerSecond, 2)} / 초`}</div>
    </div>
  )
}

function CountdownWidget({ live }: { live: Live }) {
  const { secondsUntilOff, todayTotal } = live.snap
  let main: string
  let sub: string
  if (secondsUntilOff > 0) {
    main = hms(secondsUntilOff)
    sub = '퇴근까지'
  } else if (todayTotal > 0) {
    main = '근무 끝'
    sub = `오늘 ${won(todayTotal)} 벌었어요`
  } else {
    main = '쉬는 날'
    sub = '오늘은 근무가 없어요'
  }
  return (
    <div className={css.box}>
      <div className={css.sub}>{sub}</div>
      <div className={css.big}>{main}</div>
    </div>
  )
}

function ClockWidget({ live }: { live: Live }) {
  const t = live.now
  const time = t.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  const date = t.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })
  return (
    <div className={css.box}>
      <div className={css.sub}>{date}</div>
      <div className={css.big}>{time}</div>
    </div>
  )
}
