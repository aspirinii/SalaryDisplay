import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { snapshot } from './engine'
import { useSettings } from './store/settings'
import { useDisplay } from './store/display'
import { useNow } from './hooks/useNow'
import { useAppearance } from './hooks/useAppearance'
import { useMilestone } from './hooks/useMilestone'
import { useFullscreen, useIdle } from './hooks/useFullscreen'
import { useLongPress } from './hooks/useLongPress'
import { SettingsPanel, type SettingsTab } from './components/SettingsPanel'
import { Onboarding } from './components/Onboarding'
import { UpdatePrompt } from './components/UpdatePrompt'
import { Board, type BoardApi } from './widgets/Board'
import { AddWidgetSheet, WidgetOptionsSheet } from './widgets/Sheets'
import { editorReducer, initialEditor } from './layout/editor'
import { PRESETS, addWidget, removeWidget, updateWidget, type Widget } from './layout/widgets'
import { won } from './format'
import css from './App.module.css'
import ed from './widgets/editor.module.css'

const STATUS_LABEL = { working: '근무 중', break: '휴게 중', off: '근무 외' } as const

/** 예전에 급여 설정을 저장한 적이 있으면 첫 실행 안내를 건너뜀 */
const HAD_SETTINGS = (() => {
  try {
    return localStorage.getItem('salary-display:settings') !== null
  } catch {
    return false
  }
})()

type Sheet = { kind: 'options'; id: string } | { kind: 'add' } | null

export default function App() {
  const settings = useSettings((s) => s.settings)
  const display = useDisplay((s) => s.display)
  const updateDisplay = useDisplay((s) => s.updateDisplay)
  const setWidgets = useDisplay((s) => s.setWidgets)
  const [settingsTab, setSettingsTab] = useState<SettingsTab | null>(null)
  const [editor, dispatch] = useReducer(editorReducer, initialEditor)
  const [sheet, setSheet] = useState<Sheet>(null)
  const [deleted, setDeleted] = useState<number>(0) // 삭제 알림 표시용 카운터
  useAppearance(display)
  const fullscreen = useFullscreen()
  const toggleFullscreen = fullscreen.toggle
  const idle = useIdle(fullscreen.active)

  const editing = editor.draft !== null
  const widgets = editor.draft ?? display.widgets

  const startEdit = useCallback(() => {
    setSettingsTab(null)
    dispatch({ type: 'start', widgets: useDisplay.getState().display.widgets })
  }, [])
  const finishEdit = () => {
    if (editor.draft) setWidgets(editor.draft)
    dispatch({ type: 'end' })
    setSheet(null)
    setDeleted(0)
  }
  const cancelEdit = () => {
    dispatch({ type: 'end' })
    setSheet(null)
    setDeleted(0)
  }

  const api: BoardApi = useMemo(
    () => ({
      change: (fn, record = true) => dispatch({ type: 'apply', fn, record }),
      remove: (id) => {
        dispatch({ type: 'apply', fn: (l) => removeWidget(l, id), record: true })
        setDeleted((n) => n + 1)
      },
      openOptions: (id) => setSheet({ kind: 'options', id }),
      openAdd: () => setSheet({ kind: 'add' }),
    }),
    [],
  )

  // 삭제 알림은 5초 뒤 사라짐
  useEffect(() => {
    if (!deleted) return
    const id = window.setTimeout(() => setDeleted(0), 5000)
    return () => clearTimeout(id)
  }, [deleted])

  // 키보드: F = 전체화면, 편집 중 ⌘Z = 되돌리기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, select, textarea, [contenteditable]')) return
      if (editing && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        dispatch({ type: 'undo' })
        return
      }
      if (settingsTab || editing || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        void toggleFullscreen()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [settingsTab, editing, toggleFullscreen])

  const longPress = useLongPress(startEdit, !editing && !fullscreen.active && !settingsTab)

  // 연속 모드만 매 프레임, 나머지는 초 단위 갱신 (CPU 절약)
  const now = useNow(display.updateMode === 'continuous' ? 'frame' : 'second')
  const needYear = widgets.some((w) => w.period === 'year')
  const snap = snapshot(settings, now, { year: needYear })
  const milestone = useMilestone(snap.today, display.milestoneUnit, display.milestones)
  const live = { snap, now, display, milestone }

  const optionsWidget = sheet?.kind === 'options' ? widgets.find((w) => w.id === sheet.id) : undefined
  const showOnboarding = !display.onboarded && !HAD_SETTINGS && !editing

  return (
    <main className={css.main} data-focus={fullscreen.active} data-idle={idle} {...longPress}>
      {editing ? (
        <div className={ed.toolbar}>
          <strong>
            ✎ <span className={ed.wide}>화면 </span>편집 중
          </strong>
          <button
            onClick={() => dispatch({ type: 'undo' })}
            disabled={editor.history.length === 0}
            title="되돌리기 (⌘Z)"
            aria-label="되돌리기"
          >
            ↶<span className={ed.wide}> 되돌리기</span>
          </button>
          <button onClick={() => setSheet({ kind: 'add' })} aria-label="위젯 추가">
            ＋<span className={ed.wide}> 추가</span>
          </button>
          <button onClick={cancelEdit}>취소</button>
          <button className={ed.primary} onClick={finishEdit}>
            완료
          </button>
        </div>
      ) : (
        <header className={css.top}>
          <span className={css.status} data-status={snap.status}>
            {STATUS_LABEL[snap.status]}
            {snap.status !== 'off' && <span className={css.rate}>+{won(snap.ratePerSecond, 2)}/초</span>}
          </span>
          <span className={css.actions}>
            {!fullscreen.active && (
              <button className={css.gear} onClick={startEdit} aria-label="화면 편집" title="화면 편집 (빈 곳 길게 누르기)">
                ✎ <span className={css.btnText}>편집</span>
              </button>
            )}
            <button
              className={css.gear}
              onClick={() => void toggleFullscreen()}
              aria-label={fullscreen.active ? '전체화면 끝내기' : '전체화면'}
              title="전체화면 (F)"
            >
              {fullscreen.active ? '⤡' : '⛶'} <span className={css.btnText}>{fullscreen.active ? '나가기' : '전체화면'}</span>
            </button>
            <button className={css.gear} onClick={() => setSettingsTab('pay')} aria-label="설정 열기">
              ⚙︎ <span className={css.btnText}>설정</span>
            </button>
          </span>
        </header>
      )}

      <Board widgets={widgets} live={live} editing={editing} api={api} />

      {editing && widgets.length === 0 && <p className={css.empty}>위젯이 없어요. ＋ 위젯 추가로 넣어 보세요.</p>}
      {!editing && display.widgets.length === 0 && (
        <p className={css.empty}>
          표시할 위젯이 없어요. <button onClick={startEdit}>✎ 화면 편집</button>
        </p>
      )}

      {optionsWidget && (
        <WidgetOptionsSheet
          widget={optionsWidget}
          display={display}
          onChange={(patch) => api.change((l) => updateWidget(l, optionsWidget.id, patch))}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.kind === 'add' && (
        <AddWidgetSheet
          onAdd={(w: Widget) => api.change((l) => addWidget(l, w))}
          onPreset={(id) => api.change(() => PRESETS[id].build())}
          onClose={() => setSheet(null)}
        />
      )}
      {editing && deleted > 0 && (
        <div className={ed.undoToast} role="status">
          위젯을 삭제했어요
          <button
            onClick={() => {
              dispatch({ type: 'undo' })
              setDeleted(0)
            }}
          >
            되돌리기
          </button>
        </div>
      )}

      {milestone !== null && !editing && (
        <div className={css.toast} role="status" key={milestone}>
          🎉 오늘 {won(milestone)} 돌파!
        </div>
      )}
      <SettingsPanel tab={settingsTab} onTab={setSettingsTab} onClose={() => setSettingsTab(null)} onEditLayout={startEdit} />
      {showOnboarding && <Onboarding onDone={() => updateDisplay({ onboarded: true })} />}
      <UpdatePrompt busy={editing || settingsTab !== null || fullscreen.active || showOnboarding} />
    </main>
  )
}
