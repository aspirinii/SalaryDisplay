import type { Widget } from './widgets'

/**
 * 화면 편집 세션 상태 (순수 리듀서).
 * draft = 편집 중인 배치 (null = 편집 아님), history = 되돌리기용 이전 배치들.
 * 완료할 때만 저장하고, 취소하면 draft를 버린다.
 */
export interface EditorState {
  draft: Widget[] | null
  history: Widget[][]
}

export type EditorAction =
  | { type: 'start'; widgets: Widget[] }
  /** record=false: 되돌리기 기록 없이 바꿈 (드래그로 크기 조절 중 연속 변경) */
  | { type: 'apply'; fn: (list: Widget[]) => Widget[]; record: boolean }
  | { type: 'undo' }
  | { type: 'end' }

export const initialEditor: EditorState = { draft: null, history: [] }

const MAX_HISTORY = 50

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'start':
      return { draft: action.widgets, history: [] }
    case 'apply': {
      if (!state.draft) return state
      const next = action.fn(state.draft)
      if (next === state.draft) return state
      return {
        draft: next,
        history: action.record ? [...state.history, state.draft].slice(-MAX_HISTORY) : state.history,
      }
    }
    case 'undo': {
      if (!state.draft || state.history.length === 0) return state
      return { draft: state.history[state.history.length - 1], history: state.history.slice(0, -1) }
    }
    case 'end':
      return initialEditor
  }
}
