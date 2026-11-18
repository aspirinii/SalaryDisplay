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
  type PeriodKey,
  type PresetId,
  type Widget,
  type WidgetType,
} from '../layout/widgets'
import { SKINS } from '../skins/registry'
import type { DisplayOptions } from '../store/display'
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
}: {
  widget: Widget
  display: DisplayOptions
  onChange: (patch: Partial<Omit<Widget, 'id'>>) => void
  onClose: () => void
}) {
  const info = WIDGET_INFO[widget.type]
  const hasPeriod = widget.type === 'counter' || widget.type === 'progress'
  return (
    <Sheet title={`${info.name} 설정`} onClose={onClose}>
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

      {hasPeriod && (
        <label className={ed.check}>
          <input
            type="checkbox"
            checked={widget.showLabel !== false}
            onChange={(e) => onChange({ showLabel: e.target.checked ? undefined : false })}
          />
          기간 이름 표시 (예: “오늘”)
        </label>
      )}
    </Sheet>
  )
}

/* ───────────── 위젯 추가 · 배치 프리셋 ───────────── */

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
          const periodic = t === 'counter' || t === 'progress'
          return (
            <div key={t} className={ed.item} role={periodic ? 'group' : undefined}>
              <span className={ed.itemIcon} aria-hidden>
                {info.icon}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong>{info.name}</strong>
                <small>{info.description}</small>
                {periodic && (
                  <div className={ed.quick}>
                    {PERIODS.map((p) => (
                      <button key={p} onClick={() => add(t, { period: p })}>
                        ＋ {PERIOD_LABEL[p]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {!periodic && (
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
