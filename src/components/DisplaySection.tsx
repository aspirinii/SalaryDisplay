import { SKINS } from '../skins/registry'
import {
  ACCENTS,
  FONTS,
  MILESTONE_UNITS,
  useDisplay,
  type AccentId,
  type DisplayOptions,
  type FontId,
  type ThemeId,
} from '../store/display'
import { SkinPreview } from './SkinPreview'
import { playMoney, unlockSound } from '../pile/sound'
import css from './SettingsPanel.module.css'

const THEMES: [ThemeId, string][] = [
  ['system', '기기 설정'],
  ['dark', '다크'],
  ['light', '라이트'],
  ['contrast', '고대비'],
]

/** 🎨 꾸미기 탭: 화면 전체에 적용되는 모양 */
export function LookSection({ open, onEditLayout }: { open: boolean; onEditLayout: () => void }) {
  const display = useDisplay((s) => s.display)
  const update = useDisplay((s) => s.updateDisplay)
  const setWidgets = useDisplay((s) => s.setWidgets)
  const overridden = display.widgets.filter((w) => w.type === 'counter' && w.skin).length

  const colorGroup = (ids: AccentId[]) =>
    ids.map((id) => {
      const a = ACCENTS[id]
      return (
        <button
          key={id}
          role="radio"
          aria-checked={display.accent === id}
          aria-label={a.label}
          title={a.label}
          className={css.swatch}
          data-neutral={a.neutral || undefined}
          style={{
            // 견본은 지금 배경에 맞는 쪽 색으로
            background: a.dark ? `light-dark(${a.light}, ${a.dark})` : 'light-dark(#0f8a5f, #3fd39a)',
          }}
          onClick={() => update({ accent: id })}
        />
      )
    })

  return (
    <>
      <section className={css.section}>
        <button className={css.editLink} onClick={onEditLayout}>
          <span>✎</span>
          <span>
            <strong>화면 편집으로 가기</strong>
            <small>위젯을 끌어서 옮기고, ✕로 빼고, 크기·표현 방식을 바꿔요</small>
          </span>
        </button>
      </section>

      <section className={css.section}>
        <h3>색</h3>
        <fieldset className={css.field}>
          <legend>테마</legend>
          <div className={css.segmented}>
            {THEMES.map(([id, label]) => (
              <button key={id} role="radio" aria-checked={display.theme === id} onClick={() => update({ theme: id })}>
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className={css.field}>
          <legend>강조색</legend>
          <div className={css.swatchRow}>
            <span className={css.swatchLabel}>무채색</span>
            <div className={css.swatches} role="radiogroup" aria-label="무채색">
              {colorGroup(['mono', 'silver', 'gray'])}
            </div>
          </div>
          <div className={css.swatchRow}>
            <span className={css.swatchLabel}>컬러</span>
            <div className={css.swatches} role="radiogroup" aria-label="컬러">
              {colorGroup(['default', 'blue', 'gold', 'pink', 'purple', 'red'])}
            </div>
          </div>
          <p className={css.hint}>
            지금: {ACCENTS[display.accent].label}
            {ACCENTS[display.accent].neutral && ' · 배경에 따라 밝기가 바뀌어 어느 테마에서도 잘 보여요'}
          </p>
          <button
            className={css.chipButton}
            onClick={() => update({ theme: 'dark', accent: 'mono' })}
            aria-pressed={display.theme === 'dark' && display.accent === 'mono'}
          >
            ◼︎ 모노 스타일 (검은 배경 + 흰 숫자)
          </button>
        </fieldset>
      </section>

      <section className={css.section}>
        <h3>숫자</h3>
        <fieldset className={css.field}>
          <legend>기본 표현 방식 — 위젯에서 따로 정하지 않은 카운터에 적용</legend>
          <div className={css.skins} role="radiogroup" aria-label="기본 표현 방식">
            {SKINS.map((skin) => (
              <button
                key={skin.id}
                role="radio"
                aria-checked={display.defaultSkin === skin.id}
                className={css.skinCard}
                onClick={() => update({ defaultSkin: skin.id })}
              >
                {/* 패널이 닫혀 있으면 미리보기 애니메이션 멈춤 */}
                <div className={css.skinPreview}>{open && <SkinPreview skin={skin.id} display={display} />}</div>
                <strong>{skin.name}</strong>
                <small>{skin.description}</small>
              </button>
            ))}
          </div>
          {overridden > 0 && (
            <p className={css.hint}>
              카운터 {overridden}개는 따로 정한 표현 방식을 써요.{' '}
              <button
                className={css.link}
                onClick={() =>
                  setWidgets(display.widgets.map((w) => (w.type === 'counter' && w.skin ? { ...w, skin: undefined } : w)))
                }
              >
                모두 기본값으로 맞추기
              </button>
            </p>
          )}
        </fieldset>
        <fieldset className={css.field}>
          <legend>글꼴</legend>
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
          <legend>소수점 (기본값)</legend>
          <div className={css.segmented}>
            {([0, 1, 2, 3] as const).map((d) => (
              <button key={d} role="radio" aria-checked={display.decimals === d} onClick={() => update({ decimals: d })}>
                {d === 0 ? '없음' : `${d}자리`}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className={css.field}>
          <legend>숫자 갱신</legend>
          <div className={css.segmented}>
            {(
              [
                ['continuous', '연속'],
                ['second', '1초마다'],
                ['step', '금액 단위'],
              ] as [DisplayOptions['updateMode'], string][]
            ).map(([id, label]) => (
              <button key={id} role="radio" aria-checked={display.updateMode === id} onClick={() => update({ updateMode: id })}>
                {label}
              </button>
            ))}
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
            {display.updateMode === 'second' && '1초에 한 번 부드럽게 넘어감 (전력 절약, 플립·슬롯이 더 화려해짐)'}
            {display.updateMode === 'step' && '정해진 금액이 쌓일 때마다 넘어감'}
          </p>
        </fieldset>
      </section>

      <section className={css.section}>
        <h3>돈 쌓기 위젯</h3>
        <label className={css.toggle}>
          <input type="checkbox" checked={display.pileDrop} onChange={(e) => update({ pileDrop: e.target.checked })} />
          <span>새 동전·지폐가 위에서 떨어지는 애니메이션</span>
        </label>
        <label className={css.toggle}>
          <input
            type="checkbox"
            checked={display.pileSound}
            onChange={(e) => {
              update({ pileSound: e.target.checked })
              if (e.target.checked) {
                unlockSound()
                playMoney('coin')
              }
            }}
          />
          <span>소리 (동전 짤랑 · 지폐 사락, 1초에 한 번까지)</span>
        </label>
      </section>

      <section className={css.section}>
        <h3>축하 효과</h3>
        <label className={css.toggle}>
          <input type="checkbox" checked={display.milestones} onChange={(e) => update({ milestones: e.target.checked })} />
          <span>
            오늘 금액이 단위를 넘을 때 축하
            <select
              style={{ marginLeft: 8 }}
              value={display.milestoneUnit}
              disabled={!display.milestones}
              onChange={(e) => update({ milestoneUnit: Number(e.target.value) as DisplayOptions['milestoneUnit'] })}
              aria-label="축하 단위"
            >
              {MILESTONE_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u >= 10_000 ? `${u / 10_000}만 원마다` : `${u.toLocaleString('ko-KR')}원마다`}
                </option>
              ))}
            </select>
          </span>
        </label>
      </section>
    </>
  )
}
