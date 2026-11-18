import { describe, expect, it } from 'vitest'
import {
  PRESETS,
  addWidget,
  createWidget,
  moveWidget,
  removeWidget,
  sanitizeWidgets,
  sizeFromRatio,
  updateWidget,
  widgetsFromLegacy,
  type Widget,
} from './widgets'
import { sanitizeDisplay } from '../store/display'
import { editorReducer, initialEditor } from './editor'

const shape = (ws: Widget[]) => ws.map((w) => `${w.type}:${w.period ?? '-'}:${w.size}${w.skin ? ':' + w.skin : ''}`)

describe('위젯 조작', () => {
  const a = createWidget('counter', { id: 'a', period: 'today' })
  const b = createWidget('counter', { id: 'b', period: 'week' })
  const c = createWidget('progress', { id: 'c' })
  const list = [a, b, c]

  it('순서 바꾸기', () => {
    expect(moveWidget(list, 'a', 'c').map((w) => w.id)).toEqual(['b', 'c', 'a'])
    expect(moveWidget(list, 'c', 'a').map((w) => w.id)).toEqual(['c', 'a', 'b'])
    expect(moveWidget(list, 'a', 'zz')).toBe(list)
  })

  it('삭제·추가', () => {
    expect(removeWidget(list, 'b').map((w) => w.id)).toEqual(['a', 'c'])
    expect(addWidget(list, createWidget('clock', { id: 'd' })).map((w) => w.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('수정: undefined는 키 삭제, 원본 불변', () => {
    const withSkin = updateWidget(list, 'a', { skin: 'flip', size: 'L' })
    expect(withSkin[0]).toMatchObject({ skin: 'flip', size: 'L' })
    expect(list[0].skin).toBeUndefined()
    const cleared = updateWidget(withSkin, 'a', { skin: undefined })
    expect('skin' in cleared[0]).toBe(false)
  })

  it('모서리 드래그 비율 → 가장 가까운 크기', () => {
    expect(sizeFromRatio(0.3)).toBe('S')
    expect(sizeFromRatio(0.45)).toBe('M')
    expect(sizeFromRatio(0.8)).toBe('L')
    expect(sizeFromRatio(1.2)).toBe('L')
  })

  it('프리셋은 매번 새 id', () => {
    const x = PRESETS.hero.build()
    const y = PRESETS.hero.build()
    expect(shape(x)).toEqual(shape(y))
    expect(x[0].id).not.toBe(y[0].id)
  })
})

describe('저장값 검증', () => {
  it('잘못된 위젯 제거, 빠진 값 채움, 중복 id 교체', () => {
    const ws = sanitizeWidgets([
      { id: 'x', type: 'counter', size: 'L', period: 'week', skin: 'flip', decimals: 1 },
      { id: 'x', type: 'counter' },
      { type: 'nope' },
      'garbage',
      { id: 'p', type: 'progress', period: 'decade', showLabel: false },
    ])!
    expect(ws).toHaveLength(3)
    expect(ws[0]).toEqual({ id: 'x', type: 'counter', size: 'L', period: 'week', skin: 'flip', decimals: 1 })
    expect(ws[1]).toMatchObject({ type: 'counter', size: 'M', period: 'today' })
    expect(ws[1].id).not.toBe('x')
    expect(ws[2]).toEqual({ id: 'p', type: 'progress', size: 'M', period: 'today', showLabel: false })
    expect(sanitizeWidgets('x')).toBeNull()
  })
})

describe('이전 버전(v1) 변환', () => {
  it('하나 크게(이번 달) → 이번 달 크게 + 나머지 + 진행 막대', () => {
    expect(shape(widgetsFromLegacy({ layout: 'hero', heroPeriod: 'month' }))).toEqual([
      'counter:month:L',
      'counter:today:M',
      'counter:week:M',
      'progress:today:L',
    ])
  })

  it('셋 나란히 → 작게 셋 + 진행 막대', () => {
    expect(shape(widgetsFromLegacy({ layout: 'stack' }))).toEqual([
      'counter:today:S',
      'counter:week:S',
      'counter:month:S',
      'progress:today:L',
    ])
  })

  it('v1 전체 설정 변환: 스킨은 기본 스킨으로, 안내는 건너뜀', () => {
    const d = sanitizeDisplay({
      skin: 'flip',
      decimals: 0,
      updateMode: 'second',
      step: 100,
      layout: 'hero',
      heroPeriod: 'today',
      theme: 'dark',
      accent: 'blue',
      font: 'mono',
      milestones: false,
      milestoneUnit: 50000,
    })
    expect(d.defaultSkin).toBe('flip')
    expect(d.decimals).toBe(0)
    expect(d.theme).toBe('dark')
    expect(d.onboarded).toBe(true)
    expect(shape(d.widgets)[0]).toBe('counter:today:L')
  })

  it('처음 쓰는 사람은 안내 표시', () => {
    expect(sanitizeDisplay(undefined).onboarded).toBe(false)
  })
})

describe('편집 세션 (되돌리기)', () => {
  const w = (id: string) => createWidget('counter', { id })
  const start = editorReducer(initialEditor, { type: 'start', widgets: [w('a'), w('b')] })

  it('변경은 기록되고 되돌리기로 하나씩 복원', () => {
    const s1 = editorReducer(start, { type: 'apply', fn: (l) => removeWidget(l, 'a'), record: true })
    const s2 = editorReducer(s1, { type: 'apply', fn: (l) => addWidget(l, w('c')), record: true })
    expect(s2.draft!.map((x) => x.id)).toEqual(['b', 'c'])
    const u1 = editorReducer(s2, { type: 'undo' })
    expect(u1.draft!.map((x) => x.id)).toEqual(['b'])
    const u2 = editorReducer(u1, { type: 'undo' })
    expect(u2.draft!.map((x) => x.id)).toEqual(['a', 'b'])
    expect(editorReducer(u2, { type: 'undo' })).toBe(u2)
  })

  it('record=false는 기록 안 함 (크기 드래그 중)', () => {
    const s1 = editorReducer(start, { type: 'apply', fn: (l) => updateWidget(l, 'a', { size: 'L' }), record: true })
    const s2 = editorReducer(s1, { type: 'apply', fn: (l) => updateWidget(l, 'a', { size: 'S' }), record: false })
    expect(s2.history).toHaveLength(1)
    expect(editorReducer(s2, { type: 'undo' }).draft![0].size).toBe('M')
  })

  it('변화 없는 변경은 무시, 편집 아닐 때는 무시', () => {
    expect(editorReducer(start, { type: 'apply', fn: (l) => l, record: true })).toBe(start)
    expect(editorReducer(initialEditor, { type: 'apply', fn: () => [], record: true })).toBe(initialEditor)
    expect(editorReducer(start, { type: 'end' })).toEqual(initialEditor)
  })
})

describe('축하 단위', () => {
  it('100원·1,000원 단위도 저장 가능, 이상한 값은 기본값', () => {
    expect(sanitizeDisplay({ widgets: [], milestoneUnit: 100 }).milestoneUnit).toBe(100)
    expect(sanitizeDisplay({ widgets: [], milestoneUnit: 1000 }).milestoneUnit).toBe(1000)
    expect(sanitizeDisplay({ widgets: [], milestoneUnit: 777 }).milestoneUnit).toBe(10_000)
  })
})
