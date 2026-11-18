import { useNow } from '../hooks/useNow'
import { SKINS } from '../skins/registry'
import { ACCENTS, FONTS, useDisplay, type AccentId, type DisplayOptions, type FontId, type PeriodKey, type ThemeId } from '../store/display'
import { Counter } from './Counter'
import css from './SettingsPanel.module.css'

const PREVIEW_START = Date.now()
const PREVIEW_RATE = 0.35 // 미리보기: 초당 ₩0.35 → 굴러가는 모습이 잘 보이게

function SkinPreview({ options }: { options: DisplayOptions }) {
  const now = useNow(options.updateMode === 'continuous' ? 'frame' : 'second')
  const value = 128_497.6 + ((now.getTime() - PREVIEW_START) / 1000) * PREVIEW_RATE * 40
  const progress = 0.35 + (((now.getTime() - PREVIEW_START) / 1000) % 60) / 100
  return (
    <Counter value={value} ratePerSecond={PREVIEW_RATE * 40} status="working" progress={progress} options={options} size="mini" />
  )
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
      <fieldset className={css.field}>
        <legend>테마</legend>
        <div className={css.segmented}>
          {(
            [
              ['system', '기기 설정'],
              ['dark', '다크'],
              ['light', '라이트'],
              ['contrast', '고대비'],
            ] as [ThemeId, string][]
          ).map(([id, label]) => (
            <button key={id} role="radio" aria-checked={display.theme === id} onClick={() => update({ theme: id })}>
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={css.field}>
        <legend>강조색</legend>
        <div className={css.swatches}>
          {(Object.keys(ACCENTS) as AccentId[]).map((id) => (
            <button
              key={id}
              role="radio"
              aria-checked={display.accent === id}
              aria-label={ACCENTS[id].label}
              title={ACCENTS[id].label}
              className={css.swatch}
              style={{ background: ACCENTS[id].color ?? 'var(--default-accent, #2fb383)' }}
              onClick={() => update({ accent: id })}
            />
          ))}
        </div>
        {display.theme === 'contrast' && <p className={css.hint}>고대비 테마에서는 고정 강조색을 씁니다.</p>}
      </fieldset>

      <fieldset className={css.field}>
        <legend>숫자 글꼴</legend>
        <div className={css.segmented}>
          {(Object.keys(FONTS) as FontId[]).map((id) => (
            <button
              key={id}
              role="radio"
              aria-checked={display.font === id}
              onClick={() => update({ font: id })}
              style={{ fontFamily: FONTS[id].stack ?? undefined }}
            >
              {FONTS[id].label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={css.field}>
        <legend>축하 효과</legend>
        <label className={css.toggle}>
          <input
            type="checkbox"
            checked={display.milestones}
            onChange={(e) => update({ milestones: e.target.checked })}
          />
          <span>
            오늘 금액이 단위를 넘을 때 축하
            <select
              style={{ marginLeft: 8 }}
              value={display.milestoneUnit}
              disabled={!display.milestones}
              onChange={(e) => update({ milestoneUnit: Number(e.target.value) as DisplayOptions['milestoneUnit'] })}
              aria-label="축하 단위"
            >
              <option value={10000}>1만 원마다</option>
              <option value={50000}>5만 원마다</option>
              <option value={100000}>10만 원마다</option>
            </select>
          </span>
        </label>
      </fieldset>
    </section>
  )
}
