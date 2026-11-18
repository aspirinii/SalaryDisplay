import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  PERIOD_LABEL,
  SIZES,
  SIZE_LABEL,
  WIDGET_INFO,
  moveWidget,
  sizeFromRatio,
  updateWidget,
  type Widget,
} from '../layout/widgets'
import { WidgetView, type Live } from './WidgetView'
import css from './widgets.module.css'
import ed from './editor.module.css'

const widgetTitle = (w: Widget) => {
  const name = WIDGET_INFO[w.type].name
  return w.period ? `${PERIOD_LABEL[w.period]} ${name}` : name
}

export interface BoardApi {
  /** 배치 변경. record=false면 되돌리기 기록 안 함 */
  change: (fn: (list: Widget[]) => Widget[], record?: boolean) => void
  remove: (id: string) => void
  openOptions: (id: string) => void
  openAdd: () => void
}

interface Props {
  widgets: Widget[]
  live: Live
  editing: boolean
  api: BoardApi
}

export function Board({ widgets, live, editing, api }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  if (!editing) {
    return (
      <div className={css.grid}>
        {widgets.map((w) => (
          <div key={w.id} className={css.cell} data-size={w.size}>
            <WidgetView widget={w} live={live} />
          </div>
        ))}
      </div>
    )
  }

  const nameOf = (id: string | number) => {
    const w = widgets.find((x) => x.id === id)
    return w ? widgetTitle(w) : '위젯'
  }

  const onDragEnd = (e: DragEndEvent) => {
    if (e.over && e.active.id !== e.over.id) {
      const from = String(e.active.id)
      const to = String(e.over.id)
      api.change((l) => moveWidget(l, from, to))
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable: '스페이스로 집고, 방향키로 옮긴 뒤, 스페이스로 놓습니다. Esc로 취소.',
        },
        announcements: {
          onDragStart: ({ active }) => `${nameOf(active.id)}을(를) 집었어요.`,
          onDragOver: ({ active, over }) =>
            over ? `${nameOf(active.id)} → ${nameOf(over.id)} 자리` : `${nameOf(active.id)}: 놓을 자리 없음`,
          onDragEnd: ({ active, over }) =>
            over ? `${nameOf(active.id)}을(를) ${nameOf(over.id)} 자리에 놓았어요.` : `${nameOf(active.id)}을(를) 놓았어요.`,
          onDragCancel: ({ active }) => `${nameOf(active.id)} 옮기기를 취소했어요.`,
        },
      }}
    >
      <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
        <div className={css.grid} data-editing>
          {widgets.map((w) => (
            <EditableCell key={w.id} widget={w} live={live} api={api} />
          ))}
          <button className={`${css.cell} ${ed.addTile}`} data-size="L" onClick={api.openAdd}>
            ＋ 위젯 추가
          </button>
        </div>
      </SortableContext>
    </DndContext>
  )
}

function EditableCell({ widget, live, api }: { widget: Widget; live: Live; api: BoardApi }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
  })
  const title = widgetTitle(widget)

  // 모서리 드래그로 크기: 격자 폭 대비 비율 → 가장 가까운 S/M/L
  const onResizeStart = (e: React.PointerEvent<HTMLElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const cell = e.currentTarget.closest('[data-cell]') as HTMLElement | null
    const grid = cell?.parentElement
    if (!cell || !grid) return
    const startW = cell.getBoundingClientRect().width
    const gridW = grid.getBoundingClientRect().width
    const x0 = e.clientX
    let last = widget.size
    let recorded = false
    const move = (ev: PointerEvent) => {
      const size = sizeFromRatio((startW + ev.clientX - x0) / gridW)
      if (size === last) return
      last = size
      api.change((l) => updateWidget(l, widget.id, { size }), !recorded)
      recorded = true
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  return (
    <div
      ref={setNodeRef}
      data-cell
      className={css.cell}
      data-size={widget.size}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <div className={ed.frame} data-dragging={isDragging}>
        <div className={ed.controls}>
          <button
            ref={setActivatorNodeRef}
            className={ed.handle}
            aria-label={`${title} 옮기기`}
            title="끌어서 순서 바꾸기"
            {...attributes}
            {...listeners}
          >
            ⠿
          </button>
          <span className={ed.title}>{title}</span>
          <span className={ed.sizes} role="radiogroup" aria-label="크기">
            {SIZES.map((s) => (
              <button
                key={s}
                role="radio"
                aria-checked={widget.size === s}
                title={SIZE_LABEL[s]}
                onClick={() => api.change((l) => updateWidget(l, widget.id, { size: s }))}
              >
                {s}
              </button>
            ))}
          </span>
          <button className={ed.icon} onClick={() => api.openOptions(widget.id)} aria-label={`${title} 설정`} title="위젯 설정">
            ⚙
          </button>
          <button className={`${ed.icon} ${ed.remove}`} onClick={() => api.remove(widget.id)} aria-label={`${title} 삭제`} title="삭제">
            ✕
          </button>
        </div>
        <div className={ed.content} inert>
          <WidgetView widget={widget} live={live} />
        </div>
        <span className={ed.resize} onPointerDown={onResizeStart} title="끌어서 크기 조절" aria-hidden>
          ◢
        </span>
      </div>
    </div>
  )
}
