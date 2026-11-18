import { useEffect, useState } from 'react'
import {
  monthPeriod,
  monthlyAmount,
  paidMinutesOfDay,
  paidSecondsBetween,
  type BreakRange,
  type DaySchedule,
  type PayType,
  type Settings,
  type Weekday,
} from '../engine'
import { parseHHMM } from '../engine/time'
import { useSettings } from '../store/settings'
import { won } from '../format'
import { DisplaySection } from './DisplaySection'
import css from './SettingsPanel.module.css'

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'] as const
const PAY_TYPES: { value: PayType; label: string }[] = [
  { value: 'annual', label: '연봉' },
  { value: 'monthly', label: '월급' },
  { value: 'hourly', label: '시급' },
]

const PRESETS: { label: string; start: string; end: string; days: Weekday[] }[] = [
  { label: '9–6', start: '09:00', end: '18:00', days: [1, 2, 3, 4, 5] },
  { label: '10–7', start: '10:00', end: '19:00', days: [1, 2, 3, 4, 5] },
  { label: '8–5', start: '08:00', end: '17:00', days: [1, 2, 3, 4, 5] },
  { label: '주4일 (월–목 9–6)', start: '09:00', end: '18:00', days: [1, 2, 3, 4] },
]

const hm = (minutes: number) => {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m ? `${h}시간 ${m}분` : `${h}시간`
}

export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      <div className={css.backdrop} data-open={open} onClick={onClose} />
      <aside className={css.sheet} data-open={open} aria-hidden={!open} aria-label="설정">
        <header className={css.head}>
          <h2>설정</h2>
          <button className={css.ghost} onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </header>
        <div className={css.body}>
          <DisplaySection open={open} />
          <PaySection />
          <ScheduleSection />
          <PeriodSection />
          <HolidaySection />
          <ResetSection />
        </div>
      </aside>
    </>
  )
}

/* ───────────── 급여 ───────────── */

function PaySection() {
  const settings = useSettings((s) => s.settings)
  const update = useSettings((s) => s.update)
  const now = new Date()
  const period = monthPeriod(settings, now)
  const monthHours = paidSecondsBetween(settings, period.start, period.end) / 3600
  const monthly = monthlyAmount(settings)
  const basisHours = settings.rateBasis === 'fixedHours' ? settings.fixedMonthlyHours : monthHours
  const hourly = settings.payType === 'hourly' ? settings.amount : basisHours > 0 ? monthly / basisHours : 0
  const monthlyShown = settings.payType === 'hourly' ? hourly * monthHours : monthly

  return (
    <section className={css.section}>
      <h3>급여</h3>
      <div className={css.segmented} role="radiogroup" aria-label="급여 종류">
        {PAY_TYPES.map((t) => (
          <button
            key={t.value}
            role="radio"
            aria-checked={settings.payType === t.value}
            onClick={() => update({ payType: t.value })}
          >
            {t.label}
          </button>
        ))}
      </div>
      <label className={css.amount}>
        <span>₩</span>
        <input
          inputMode="numeric"
          value={settings.amount ? settings.amount.toLocaleString('ko-KR') : ''}
          placeholder="0"
          onChange={(e) => update({ amount: Number(e.target.value.replace(/\D/g, '')) || 0 })}
          aria-label="금액"
        />
      </label>
      <dl className={css.facts}>
        <div>
          <dt>연</dt>
          <dd>{won(monthlyShown * 12)}</dd>
        </div>
        <div>
          <dt>월</dt>
          <dd>{won(monthlyShown)}</dd>
        </div>
        <div>
          <dt>시간당</dt>
          <dd>{won(hourly)}</dd>
        </div>
        <div>
          <dt>초당</dt>
          <dd>{won(hourly / 3600, 2)}</dd>
        </div>
      </dl>

      {settings.payType !== 'hourly' && (
        <fieldset className={css.field}>
          <legend>초당 단가 기준</legend>
          <label className={css.radio}>
            <input
              type="radio"
              checked={settings.rateBasis === 'actualSchedule'}
              onChange={() => update({ rateBasis: 'actualSchedule' })}
            />
            <span>
              실제 근무시간 기준 <small>이번 달 {hm(monthHours * 60)} · 월말 퇴근 시 정확히 월급</small>
            </span>
          </label>
          <label className={css.radio}>
            <input
              type="radio"
              checked={settings.rateBasis === 'fixedHours'}
              onChange={() => update({ rateBasis: 'fixedHours' })}
            />
            <span>
              고정 시간 기준
              <input
                className={css.small}
                type="number"
                min={1}
                max={744}
                value={settings.fixedMonthlyHours}
                onChange={(e) => update({ fixedMonthlyHours: Number(e.target.value) })}
                disabled={settings.rateBasis !== 'fixedHours'}
                aria-label="월 기준 시간"
              />
              시간/월 <small>초당 단가가 매달 같음</small>
            </span>
          </label>
        </fieldset>
      )}
      {settings.payType === 'hourly' && (
        <p className={css.hint}>시급은 근무한 초마다 시급 ÷ 3600씩 쌓입니다. 이번 달 근무 {hm(monthHours * 60)}.</p>
      )}
    </section>
  )
}

/* ───────────── 근무 스케줄 ───────────── */

function ScheduleSection() {
  const settings = useSettings((s) => s.settings)
  const update = useSettings((s) => s.update)
  const copyDay = useSettings((s) => s.copyDay)
  const setDay = useSettings((s) => s.setDay)

  const order: Weekday[] = settings.weekStartsOn === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6]
  const weekMinutes = order.reduce((sum: number, d) => sum + paidMinutesOfDay(settings.schedule[d], settings.breaksPaidByDefault), 0)

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    for (const d of [0, 1, 2, 3, 4, 5, 6] as Weekday[]) {
      const cur = settings.schedule[d]
      setDay(d, { ...cur, enabled: p.days.includes(d), work: { start: p.start, end: p.end } })
    }
  }

  return (
    <section className={css.section}>
      <h3>
        근무 스케줄 <small>주 {hm(weekMinutes)}</small>
      </h3>
      <div className={css.chips}>
        {PRESETS.map((p) => (
          <button key={p.label} onClick={() => applyPreset(p)}>
            {p.label}
          </button>
        ))}
        <button onClick={() => copyDay(1, [2, 3, 4, 5])} title="월요일의 근무·휴게 설정을 화~금에 복사">
          월요일 → 평일 복사
        </button>
      </div>

      <label className={css.toggle}>
        <input
          type="checkbox"
          checked={settings.breaksPaidByDefault}
          onChange={(e) => update({ breaksPaidByDefault: e.target.checked })}
        />
        <span>
          휴게시간에도 돈 쌓기 <small>기본값 · 휴게시간마다 따로 바꿀 수 있음</small>
        </span>
      </label>

      <div className={css.days}>
        {order.map((d) => (
          <DayRow key={d} day={d} settings={settings} onChange={(v) => setDay(d, v)} />
        ))}
      </div>
    </section>
  )
}

function DayRow({ day, settings, onChange }: { day: Weekday; settings: Settings; onChange: (v: DaySchedule) => void }) {
  const sched = settings.schedule[day]
  const minutes = paidMinutesOfDay(sched, settings.breaksPaidByDefault)
  const overnight = parseHHMM(sched.work.end) <= parseHHMM(sched.work.start)

  const setWork = (key: 'start' | 'end', value: string) => {
    if (value) onChange({ ...sched, work: { ...sched.work, [key]: value } })
  }
  const setBreak = (i: number, patch: Partial<BreakRange>) => {
    const breaks = sched.breaks.map((b, j) => (j === i ? { ...b, ...patch } : b))
    onChange({ ...sched, breaks })
  }
  const removeBreak = (i: number) => onChange({ ...sched, breaks: sched.breaks.filter((_, j) => j !== i) })
  const addBreak = () => onChange({ ...sched, breaks: [...sched.breaks, { start: '12:00', end: '13:00' }] })

  return (
    <div className={css.day} data-enabled={sched.enabled}>
      <div className={css.dayMain}>
        <label className={css.dayName} data-weekend={day === 0 || day === 6}>
          <input type="checkbox" checked={sched.enabled} onChange={(e) => onChange({ ...sched, enabled: e.target.checked })} />
          {DAY_NAMES[day]}
        </label>
        {sched.enabled ? (
          <>
            <input type="time" value={sched.work.start} onChange={(e) => setWork('start', e.target.value)} aria-label={`${DAY_NAMES[day]} 출근`} />
            <span className={css.dash}>–</span>
            <input type="time" value={sched.work.end} onChange={(e) => setWork('end', e.target.value)} aria-label={`${DAY_NAMES[day]} 퇴근`} />
            <span className={css.dayHours}>
              {overnight && <em>다음날 </em>}
              {hm(minutes)}
            </span>
          </>
        ) : (
          <span className={css.off}>휴무</span>
        )}
      </div>
      {sched.enabled && (
        <div className={css.breaks}>
          {sched.breaks.map((b, i) => (
            <div key={i} className={css.breakRow}>
              <span className={css.breakLabel}>휴게</span>
              <input type="time" value={b.start} onChange={(e) => e.target.value && setBreak(i, { start: e.target.value })} aria-label="휴게 시작" />
              <span className={css.dash}>–</span>
              <input type="time" value={b.end} onChange={(e) => e.target.value && setBreak(i, { end: e.target.value })} aria-label="휴게 끝" />
              <select
                value={b.paid === undefined ? 'default' : b.paid ? 'paid' : 'unpaid'}
                onChange={(e) => {
                  const v = e.target.value
                  setBreak(i, { paid: v === 'default' ? undefined : v === 'paid' })
                }}
                aria-label="휴게 중 돈 쌓임"
              >
                <option value="default">기본값({settings.breaksPaidByDefault ? '유급' : '무급'})</option>
                <option value="paid">유급</option>
                <option value="unpaid">무급</option>
              </select>
              <button className={css.ghost} onClick={() => removeBreak(i)} aria-label="휴게 삭제">
                ✕
              </button>
            </div>
          ))}
          <button className={css.link} onClick={addBreak}>
            + 휴게시간
          </button>
        </div>
      )}
    </div>
  )
}

/* ───────────── 기간 기준 ───────────── */

function PeriodSection() {
  const settings = useSettings((s) => s.settings)
  const update = useSettings((s) => s.update)
  const period = monthPeriod(settings, new Date())
  const fmt = (ms: number) => new Date(ms).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })

  return (
    <section className={css.section}>
      <h3>기간 기준</h3>
      <fieldset className={css.field}>
        <legend>한 주의 시작</legend>
        <div className={css.segmented}>
          <button role="radio" aria-checked={settings.weekStartsOn === 1} onClick={() => update({ weekStartsOn: 1 })}>
            월요일
          </button>
          <button role="radio" aria-checked={settings.weekStartsOn === 0} onClick={() => update({ weekStartsOn: 0 })}>
            일요일
          </button>
        </div>
      </fieldset>
      <fieldset className={css.field}>
        <legend>한 달의 시작</legend>
        <div className={css.segmented}>
          <button role="radio" aria-checked={settings.monthBasis === 'calendar'} onClick={() => update({ monthBasis: 'calendar' })}>
            매월 1일
          </button>
          <button role="radio" aria-checked={settings.monthBasis === 'payday'} onClick={() => update({ monthBasis: 'payday' })}>
            급여일 기준
          </button>
        </div>
        {settings.monthBasis === 'payday' && (
          <label className={css.inline}>
            매월
            <input
              className={css.small}
              type="number"
              min={1}
              max={31}
              value={settings.payday}
              onChange={(e) => update({ payday: Number(e.target.value) })}
              aria-label="급여일"
            />
            일부터 <small>(없는 날은 그 달 말일)</small>
          </label>
        )}
        <p className={css.hint}>
          이번 달 기간: {fmt(period.start)} ~ {fmt(period.end - 1)}
        </p>
      </fieldset>
    </section>
  )
}

/* ───────────── 공휴일 ───────────── */

function HolidaySection() {
  const holidays = useSettings((s) => s.settings.holidays)
  const update = useSettings((s) => s.update)
  const [date, setDate] = useState('')

  return (
    <section className={css.section}>
      <h3>
        쉬는 날 <small>공휴일·연차 — 이 날 시작하는 근무는 계산에서 빠짐</small>
      </h3>
      <div className={css.inline}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="쉬는 날" />
        <button
          onClick={() => {
            if (date) update({ holidays: [...holidays, date] })
            setDate('')
          }}
          disabled={!date}
        >
          추가
        </button>
      </div>
      {holidays.length > 0 && (
        <div className={css.chips}>
          {holidays.map((h) => (
            <button key={h} onClick={() => update({ holidays: holidays.filter((x) => x !== h) })} title="삭제">
              {h} ✕
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function ResetSection() {
  const reset = useSettings((s) => s.reset)
  return (
    <section className={css.section}>
      <button
        className={css.danger}
        onClick={() => {
          if (confirm('모든 설정을 기본값으로 되돌릴까요?')) reset()
        }}
      >
        기본값으로 초기화
      </button>
    </section>
  )
}
