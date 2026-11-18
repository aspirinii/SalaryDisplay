import { useState } from 'react'
import { monthPeriod, paidSecondsBetween, monthlyAmount, type PayType } from '../engine'
import { useSettings } from '../store/settings'
import { useDisplay } from '../store/display'
import { SCHEDULE_PRESETS, applySchedulePreset } from '../store/schedulePresets'
import { PRESETS, type PresetId } from '../layout/widgets'
import { won } from '../format'
import css from './Onboarding.module.css'

const PAY_TYPES: [PayType, string][] = [
  ['monthly', '월급'],
  ['annual', '연봉'],
  ['hourly', '시급'],
]

/** 첫 실행 3단계 안내: 급여 → 근무시간 → 화면 배치. 언제든 건너뛰기 가능. */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const settings = useSettings((s) => s.settings)
  const update = useSettings((s) => s.update)
  const setWidgets = useDisplay((s) => s.setWidgets)
  const [preset, setPreset] = useState<PresetId>('hero')
  const [schedule, setSchedule] = useState<string | null>('9–6')

  const period = monthPeriod(settings, new Date())
  const monthHours = paidSecondsBetween(settings, period.start, period.end) / 3600
  const monthly = settings.payType === 'hourly' ? settings.amount * monthHours : monthlyAmount(settings)

  const finish = () => {
    setWidgets(PRESETS[preset].build())
    onDone()
  }

  return (
    <div className={css.backdrop}>
      <div className={css.card} role="dialog" aria-modal="true" aria-label="처음 설정">
        <div className={css.top}>
          <div className={css.dots} aria-label={`${step + 1} / 3단계`}>
            {[0, 1, 2].map((i) => (
              <span key={i} data-on={i <= step} />
            ))}
          </div>
          <button className={css.skip} onClick={onDone}>
            건너뛰기
          </button>
        </div>

        {step === 0 && (
          <>
            <h2>얼마 받으세요?</h2>
            <p className={css.lead}>근무시간 동안 이 금액이 초 단위로 쌓여요. 이 기기에만 저장돼요.</p>
            <div className={css.seg} role="radiogroup" aria-label="급여 종류">
              {PAY_TYPES.map(([id, label]) => (
                <button key={id} role="radio" aria-checked={settings.payType === id} onClick={() => update({ payType: id })}>
                  {label}
                </button>
              ))}
            </div>
            <label className={css.amount}>
              <span>₩</span>
              <input
                autoFocus
                inputMode="numeric"
                value={settings.amount ? settings.amount.toLocaleString('ko-KR') : ''}
                placeholder="0"
                onChange={(e) => update({ amount: Number(e.target.value.replace(/\D/g, '')) || 0 })}
                aria-label="금액"
              />
            </label>
            <p className={css.hint}>월 {won(monthly)} 기준</p>
          </>
        )}

        {step === 1 && (
          <>
            <h2>언제 일하세요?</h2>
            <p className={css.lead}>점심 12–13시는 쉬는 시간으로 빠져요. 요일별 세부 설정은 나중에 설정에서.</p>
            <div className={css.options}>
              {SCHEDULE_PRESETS.map((p) => (
                <button
                  key={p.label}
                  role="radio"
                  aria-checked={schedule === p.label}
                  onClick={() => {
                    setSchedule(p.label)
                    update({ schedule: applySchedulePreset(settings.schedule, p) })
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <label className={css.check}>
              <input
                type="checkbox"
                checked={settings.breaksPaidByDefault}
                onChange={(e) => update({ breaksPaidByDefault: e.target.checked })}
              />
              점심시간에도 돈이 쌓이게
            </label>
            <p className={css.hint}>이번 달 근무 {Math.round(monthHours)}시간</p>
          </>
        )}

        {step === 2 && (
          <>
            <h2>화면은 어떻게 볼까요?</h2>
            <p className={css.lead}>나중에 ✎ 편집에서 끌어서 옮기고, 빼고, 크기를 바꿀 수 있어요.</p>
            <div className={css.presets}>
              {(Object.keys(PRESETS) as PresetId[]).map((id) => (
                <button key={id} role="radio" aria-checked={preset === id} onClick={() => setPreset(id)}>
                  <strong>{PRESETS[id].name}</strong>
                  <small>{PRESETS[id].description}</small>
                </button>
              ))}
            </div>
          </>
        )}

        <div className={css.nav}>
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)}>이전</button>
          ) : (
            <span />
          )}
          {step < 2 ? (
            <button className={css.primary} onClick={() => setStep(step + 1)} disabled={step === 0 && !settings.amount}>
              다음
            </button>
          ) : (
            <button className={css.primary} onClick={finish}>
              시작하기
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
