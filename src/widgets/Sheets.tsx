import { useEffect, type ReactNode } from 'react'
import { SkinPreview } from '../components/SkinPreview'
import {
  PERIODS,
  PERIOD_LABEL,
  PRESETS,
  SIZES,
  SIZE_LABEL,
  WIDGET_INFO,
  WIDGET_TYPES,
  createWidget,
  hasPeriod as periodic,
  type PeriodKey,
  type PresetId,
  type Widget,
  type WidgetType,
} from '../layout/widgets'
import { SKINS } from '../skins/registry'
import type { DisplayOptions } from '../store/display'
import {
  ARRANGE_LABEL,
  COINS,
  DENOMS,
  MONEY_LABEL,
  OVERFLOW_LABEL,
  denomLabel,
  recommendedUnit,
  type Arrange,
  type Denom,
  type MoneyMode,
  type Overflow,
} from '../pile/money'
import {
  GOLD_MAPS,
  GOLD_NAME,
  GOLD_PIECES,
  GOLD_STYLES,
  GOLD_STYLE_NAME,
  goldPieceFor,
  type GoldMapId,
  type GoldPiece,
  type GoldStyle,
} from '../pile/gold'
import ed from './editor.module.css'

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className={ed.sheet} role="dialog" aria-label={title}>
      <div className={ed.sheetHead}>
        <h3>{title}</h3>
        <button className={ed.close} onClick={onClose} aria-label="닫기">
          ✕
        </button>
      </div>
      {children}
    </div>
  )
}

function Seg<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: [T, string][]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div className={ed.seg} role="radiogroup" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={String(v)} role="radio" aria-checked={value === v} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  )
}

/* ───────────── 위젯 하나 설정 ───────────── */

export function WidgetOptionsSheet({
  widget,
  display,
  onChange,
  onClose,
  ratePerSecond,
}: {
  widget: Widget
  display: DisplayOptions
  onChange: (patch: Partial<Omit<Widget, 'id'>>) => void
  onClose: () => void
  /** 지금 초당 금액 (돈 쌓기: 1개 나오는 간격 안내) */
  ratePerSecond?: number
}) {
  const info = WIDGET_INFO[widget.type]
  const hasPeriod = periodic(widget.type) && widget.arrange !== 'hourly'
  return (
    <Sheet title={`${info.name} 설정`} onClose={onClose}>
      {widget.type === 'pile' && <PileOptions widget={widget} onChange={onChange} ratePerSecond={ratePerSecond} />}
      {hasPeriod && (
        <div className={ed.row}>
          <span>기간</span>
          <Seg<PeriodKey>
            label="기간"
            value={widget.period ?? 'today'}
            options={PERIODS.map((p) => [p, PERIOD_LABEL[p]])}
            onChange={(period) => onChange({ period })}
          />
        </div>
      )}
      <div className={ed.row}>
        <span>크기</span>
        <Seg
          label="크기"
          value={widget.size}
          options={SIZES.map((s) => [s, `${SIZE_LABEL[s]} (${s === 'S' ? '1/3' : s === 'M' ? '1/2' : '전체'})`])}
          onChange={(size) => onChange({ size })}
        />
      </div>

      {widget.type === 'counter' && (
        <>
          <div className={ed.row}>
            <span>표현 방식</span>
            <div className={ed.skinGrid} role="radiogroup" aria-label="표현 방식">
              <button
                role="radio"
                aria-checked={widget.skin === undefined}
                className={ed.skinCard}
                onClick={() => onChange({ skin: undefined })}
              >
                <strong>기본값 따르기</strong>
                <small>꾸미기에서 정한 스킨 ({SKINS.find((s) => s.id === display.defaultSkin)?.name})</small>
              </button>
              {SKINS.map((s) => (
                <button
                  key={s.id}
                  role="radio"
                  aria-checked={widget.skin === s.id}
                  className={ed.skinCard}
                  onClick={() => onChange({ skin: s.id })}
                >
                  <div className={ed.skinPreview}>
                    <SkinPreview skin={s.id} display={{ ...display, decimals: widget.decimals ?? display.decimals }} />
                  </div>
                  <strong>{s.name}</strong>
                  <small>{s.description}</small>
                </button>
              ))}
            </div>
          </div>
          <div className={ed.row}>
            <span>소수점</span>
            <Seg<string>
              label="소수점"
              value={widget.decimals === undefined ? 'default' : String(widget.decimals)}
              options={[
                ['default', `기본값(${display.decimals})`],
                ['0', '없음'],
                ['1', '1자리'],
                ['2', '2자리'],
                ['3', '3자리'],
              ]}
              onChange={(v) => onChange({ decimals: v === 'default' ? undefined : (Number(v) as 0 | 1 | 2 | 3) })}
            />
          </div>
        </>
      )}

      {periodic(widget.type) && (
        <label className={ed.check}>
          <input
            type="checkbox"
            checked={widget.showLabel !== false}
            onChange={(e) => onChange({ showLabel: e.target.checked ? undefined : false })}
          />
          {widget.type === 'pile' ? '금액·개수·다음 1개 표시' : '기간 이름 표시 (예: “오늘”)'}
        </label>
      )}
    </Sheet>
  )
}

/* ───────────── 돈 쌓기 옵션 ───────────── */

const every = (unit: number, rate: number | undefined) => {
  if (!rate || rate <= 0) return ''
  const s = unit / rate
  if (s < 60) return `약 ${Math.round(s)}초마다 1개`
  if (s < 3600) return `약 ${Math.round(s / 60)}분마다 1개`
  return `약 ${(s / 3600).toFixed(1)}시간마다 1개`
}

function PileOptions({
  widget,
  onChange,
  ratePerSecond,
}: {
  widget: Widget
  onChange: (patch: Partial<Omit<Widget, 'id'>>) => void
  ratePerSecond?: number
}) {
  const period = widget.period ?? 'today'
  const money = widget.money ?? 'single'
  const unit = widget.unit ?? recommendedUnit(period)
  const arrange = widget.arrange ?? 'heap'
  const gold = widget.material === 'gold'
  const goldMap = widget.goldMap ?? 'tenUp'
  const pieceName = (d: Denom) => GOLD_NAME[goldPieceFor(d, goldMap, widget.goldCustom)[0]]
  return (
    <>
      <div className={ed.row}>
        <span>표현</span>
        <Seg<'won' | 'gold'>
          label="표현"
          value={gold ? 'gold' : 'won'}
          options={[
            ['won', '🪙 원화 동전·지폐'],
            ['gold', '✨ 황금 (금화·골드바)'],
          ]}
          onChange={(v) => onChange(v === 'gold' ? { material: 'gold' } : { material: undefined, goldMap: undefined, goldCustom: undefined, goldStyle: undefined })}
        />
        {gold && <small className={ed.hint}>금액은 원화 그대로, 단위마다 금 조각으로 바꿔 보여줘요</small>}
      </div>
      {gold && (
        <div className={ed.row}>
          <span>바꾸는 표</span>
          <Seg<GoldMapId>
            label="바꾸는 표"
            value={goldMap}
            options={[
              ...(Object.keys(GOLD_MAPS) as Exclude<GoldMapId, 'custom'>[]).map(
                (id) => [id, `${GOLD_MAPS[id].name}${id === 'tenUp' ? ' ★' : ''}`] as [GoldMapId, string],
              ),
              ['custom', '직접 고르기'],
            ]}
            onChange={(m) =>
              onChange(
                m === 'custom'
                  ? {
                      goldMap: m,
                      // 지금 표에서 시작
                      goldCustom: Object.fromEntries(DENOMS.map((d) => [d, goldPieceFor(d, goldMap, widget.goldCustom)[0]])),
                    }
                  : { goldMap: m === 'tenUp' ? undefined : m, goldCustom: undefined },
              )
            }
          />
          {goldMap !== 'custom' && <small className={ed.hint}>{GOLD_MAPS[goldMap].description}</small>}
          {goldMap === 'custom' && (
            <div className={ed.goldGrid}>
              {DENOMS.map((d) => (
                <label key={d}>
                  <span>{denomLabel(d)}</span>
                  <select
                    value={goldPieceFor(d, 'custom', widget.goldCustom)[0]}
                    onChange={(e) => onChange({ goldCustom: { ...widget.goldCustom, [d]: e.target.value as GoldPiece } })}
                  >
                    {GOLD_PIECES.map((p) => (
                      <option key={p} value={p}>
                        {GOLD_NAME[p]}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
      {gold && (
        <div className={ed.row}>
          <span>문양·각인</span>
          <Seg<GoldStyle | 'default'>
            label="문양·각인"
            value={widget.goldStyle ?? 'default'}
            options={[['default', '꾸미기 기본값'], ...GOLD_STYLES.map((st) => [st, GOLD_STYLE_NAME[st]] as [GoldStyle, string])]}
            onChange={(v) => onChange({ goldStyle: v === 'default' ? undefined : v })}
          />
          <small className={ed.hint}>실제 금화·제련소를 떠올리게 하는 모티프만 쓰고, 실제 도안·로고·이름은 쓰지 않아요</small>
        </div>
      )}
      <div className={ed.row}>
        <span>쌓는 방식</span>
        <Seg<Arrange>
          label="쌓는 방식"
          value={arrange}
          options={(Object.keys(ARRANGE_LABEL) as Arrange[]).map((a) => [a, ARRANGE_LABEL[a]])}
          // 시간별 칸은 오늘 기준
          onChange={(a) => onChange(a === 'hourly' ? { arrange: a, period: 'today' } : { arrange: a })}
        />
        {arrange === 'hourly' && <small className={ed.hint}>근무 시간마다 칸 하나 — 지금 시간 칸에 쌓이고, 정각이 되면 다음 칸으로</small>}
      </div>
      <div className={ed.row}>
        <span>돈 종류</span>
        <Seg<MoneyMode>
          label="돈 종류"
          value={money}
          options={(Object.keys(MONEY_LABEL) as MoneyMode[]).map((m) => [m, MONEY_LABEL[m]])}
          onChange={(m) => onChange({ money: m })}
        />
        {money !== 'single' && (
          <small className={ed.hint}>
            {money === 'mixed' && '거스름돈처럼 큰 단위부터: 만 원 → 5천 원 → 천 원 → 500원 → … → 가장 작은 단위'}
            {money === 'coins' && '500원부터 가장 작은 단위까지 동전으로'}
            {money === 'bills' && '만 원, 5천 원, 천 원으로'}
          </small>
        )}
      </div>
      {(money === 'mixed' || money === 'coins') && (
        <div className={ed.row}>
          <span>가장 작은 단위</span>
          <Seg<Denom>
            label="가장 작은 단위"
            value={unit < 1000 ? unit : 100}
            options={COINS.map((d) => [d, gold ? `${denomLabel(d)} → ${pieceName(d)}` : `🪙 ${denomLabel(d)}`])}
            onChange={(d) => onChange({ unit: d })}
          />
          <small className={ed.hint}>{every(unit < 1000 ? unit : 100, ratePerSecond)} — 이보다 작은 금액은 "다음 1개"로 표시</small>
        </div>
      )}
      {money === 'single' && (
        <div className={ed.row}>
          <span>단위</span>
          <Seg<Denom>
            label="단위"
            value={unit}
            options={DENOMS.map((d) => [
              d,
              `${gold ? '' : d < 1000 ? '🪙 ' : '💵 '}${denomLabel(d)}${gold ? ` → ${pieceName(d)}` : ''}${d === recommendedUnit(period) ? ' ★' : ''}`,
            ])}
            onChange={(d) => onChange({ unit: d })}
          />
          <small className={ed.hint}>
            {every(unit, ratePerSecond)}
            {ratePerSecond ? ' · ' : ''}★ = {arrange === 'hourly' ? '오늘' : '이 기간'}에 어울리는 단위
          </small>
        </div>
      )}
      <div className={ed.row}>
        <span>너무 많아지면</span>
        <Seg<Overflow>
          label="너무 많아지면"
          value={widget.overflow ?? 'bundle'}
          options={(Object.keys(OVERFLOW_LABEL) as Overflow[]).map((o) => [o, OVERFLOW_LABEL[o]])}
          onChange={(o) => onChange({ overflow: o === 'bundle' ? undefined : o })}
        />
        <small className={ed.hint}>
          {(widget.overflow ?? 'bundle') === 'bundle' && '동전 50개 → 롤, 1,000개 → 자루 / 지폐 100장 → 띠지 다발'}
          {widget.overflow === 'exchange' && '더 큰 단위로 바꿔서 쌓음 (100원 → 500원 → 천 원 …)'}
          {widget.overflow === 'shrink' && '조각을 작게 줄여서 계속 쌓음 (시간별 칸에서는 묶음)'}
        </small>
      </div>
    </>
  )
}

/* ───────────── 위젯 추가 · 배치 프리셋 ───────────── */

const PILE_QUICK: [string, Partial<Widget>][] = [
  ['오늘 · 500원 더미', { period: 'today', unit: 500, arrange: 'heap' }],
  ['오늘 · 시간별 칸', { period: 'today', unit: 1000, arrange: 'hourly' }],
  ['오늘 · 섞어서', { period: 'today', money: 'mixed', unit: 100, arrange: 'heap' }],
  ['이번 주 · 5천 원 차곡차곡', { period: 'week', unit: 5000, arrange: 'neat' }],
  ['이번 달 · 만 원 차곡차곡', { period: 'month', unit: 10000, arrange: 'neat' }],
  ['✨ 오늘 · 금화 더미', { period: 'today', unit: 100, arrange: 'heap', material: 'gold', goldMap: 'allCoins' }],
  ['✨ 오늘 · 골드바 피라미드', { period: 'today', unit: 1000, arrange: 'neat', material: 'gold' }],
  ['✨ 이번 달 · 금괴 차곡차곡', { period: 'month', unit: 10000, arrange: 'neat', material: 'gold' }],
]

export function AddWidgetSheet({
  onAdd,
  onPreset,
  onClose,
}: {
  onAdd: (w: Widget) => void
  onPreset: (id: PresetId) => void
  onClose: () => void
}) {
  const add = (type: WidgetType, patch: Partial<Widget> = {}) => {
    onAdd(createWidget(type, patch))
    onClose()
  }
  return (
    <Sheet title="위젯 추가" onClose={onClose}>
      <div className={ed.list}>
        {WIDGET_TYPES.map((t) => {
          const info = WIDGET_INFO[t]
          const quick = periodic(t)
          return (
            <div key={t} className={ed.item} role={quick ? 'group' : undefined}>
              <span className={ed.itemIcon} aria-hidden>
                {info.icon}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{info.name}</strong>
                <small>{info.description}</small>
                {t === 'pile' && (
                  <div className={ed.quick}>
                    {PILE_QUICK.map(([label, patch]) => (
                      <button key={label} onClick={() => add(t, patch)}>
                        ＋ {label}
                      </button>
                    ))}
                  </div>
                )}
                {quick && t !== 'pile' && (
                  <div className={ed.quick}>
                    {PERIODS.map((p) => (
                      <button key={p} onClick={() => add(t, { period: p })}>
                        ＋ {PERIOD_LABEL[p]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {!quick && (
                <button className={ed.close} onClick={() => add(t)} aria-label={`${info.name} 추가`}>
                  ＋ 추가
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className={ed.row}>
        <span>배치 프리셋 — 지금 배치를 통째로 바꿈 (되돌리기 가능)</span>
        <div className={ed.presets}>
          {(Object.keys(PRESETS) as PresetId[]).map((id) => (
            <button
              key={id}
              className={ed.preset}
              onClick={() => {
                onPreset(id)
                onClose()
              }}
            >
              <strong>{PRESETS[id].name}</strong>
              <small>{PRESETS[id].description}</small>
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  )
}
