import { useNow } from '../hooks/useNow'
import { SKINS } from '../skins/registry'
import { useDisplay, type DisplayOptions, type PeriodKey } from '../store/display'
import { Counter } from './Counter'
import css from './SettingsPanel.module.css'

const PREVIEW_START = Date.now()
const PREVIEW_RATE = 0.35 // 미리보기: 초당 ₩0.35 → 굴러가는 모습이 잘 보이게

function SkinPreview({ options }: { options: DisplayOptions }) {
  const now = useNow(options.updateMode === 'continuous' ? 'frame' : 'second')
  const value = 128_497.6 + ((now.getTime() - PREVIEW_START) / 1000) * PREVIEW_RATE * 40
  return <Counter value={value} ratePerSecond={PREVIEW_RATE * 40} status="working" options={options} size="mini" />
}

export function DisplaySection({ open }: { open: boolean }) {
  const display = useDisplay((s) => s.display)
  const update = useDisplay((s) => s.updateDisplay)

  return (
    <section className={css.section}>
      <h3>표시 방식</h3>
      <div className={css.skins} role="radiogroup" aria-label="숫자 표현">
        {SKINS.map((skin) => (
          <button
            key={skin.id}
            role="radio"
            aria-checked={display.skin === skin.id}
            className={css.skinCard}
            onClick={() => update({ skin: skin.id })}
          >
            {/* 패널이 닫혀 있으면 미리보기 애니메이션 멈춤 */}
            <div className={css.skinPreview}>{open && <SkinPreview options={{ ...display, skin: skin.id }} />}</div>
            <strong>{skin.name}</strong>
            <small>{skin.description}</small>
          </button>
        ))}
      </div>

      <fieldset className={css.field}>
        <legend>화면 구성</legend>
        <div className={css.segmented}>
          <button role="radio" aria-checked={display.layout === 'hero'} onClick={() => update({ layout: 'hero' })}>
            하나 크게
          </button>
          <button role="radio" aria-checked={display.layout === 'stack'} onClick={() => update({ layout: 'stack' })}>
            셋 나란히
          </button>
        </div>
        {display.layout === 'hero' && (
          <div className={css.segmented} style={{ marginLeft: 8 }}>
            {(['today', 'week', 'month'] as PeriodKey[]).map((p) => (
              <button
                key={p}
                role="radio"
                aria-checked={display.heroPeriod === p}
                onClick={() => update({ heroPeriod: p })}
              >
                {{ today: '오늘', week: '이번 주', month: '이번 달' }[p]}
              </button>
            ))}
          </div>
        )}
      </fieldset>

      <fieldset className={css.field}>
        <legend>숫자 갱신</legend>
        <div className={css.segmented}>
          <button
            role="radio"
            aria-checked={display.updateMode === 'continuous'}
            onClick={() => update({ updateMode: 'continuous' })}
          >
            연속
          </button>
          <button role="radio" aria-checked={display.updateMode === 'second'} onClick={() => update({ updateMode: 'second' })}>
            1초마다
          </button>
          <button role="radio" aria-checked={display.updateMode === 'step'} onClick={() => update({ updateMode: 'step' })}>
            금액 단위
          </button>
        </div>
        {display.updateMode === 'step' && (
          <select
            style={{ marginLeft: 8 }}
            value={display.step}
            onChange={(e) => update({ step: Number(e.target.value) as DisplayOptions['step'] })}
            aria-label="갱신 단위"
          >
            <option value={10}>10원마다</option>
            <option value={100}>100원마다</option>
            <option value={1000}>1,000원마다</option>
          </select>
        )}
        <p className={css.hint}>
          {display.updateMode === 'continuous' && '매 프레임 계속 올라감 (가장 부드러움)'}
          {display.updateMode === 'second' && '1초에 한 번 부드럽게 넘어감 (전력 절약)'}
          {display.updateMode === 'step' && '정해진 금액이 쌓일 때마다 넘어감'}
        </p>
      </fieldset>

      <fieldset className={css.field}>
        <legend>소수점</legend>
        <div className={css.segmented}>
          {([0, 1, 2, 3] as const).map((d) => (
            <button key={d} role="radio" aria-checked={display.decimals === d} onClick={() => update({ decimals: d })}>
              {d === 0 ? '없음' : `${d}자리`}
            </button>
          ))}
        </div>
      </fieldset>
    </section>
  )
}
