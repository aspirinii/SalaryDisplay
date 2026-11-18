import { useRef } from 'react'

/**
 * 빈 곳을 길게 누르면 실행 (버튼·입력 위에서는 무시).
 * 반환값을 요소에 그대로 펼쳐 붙인다.
 */
export function useLongPress(onFire: () => void, enabled: boolean, ms = 600) {
  const timer = useRef<number | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)

  const clear = () => {
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = null
    start.current = null
  }

  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (!enabled || e.button !== 0) return
      if ((e.target as HTMLElement).closest('button, a, input, select, textarea, [role="dialog"]')) return
      start.current = { x: e.clientX, y: e.clientY }
      timer.current = window.setTimeout(() => {
        clear()
        onFire()
      }, ms)
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 10) clear()
    },
    onPointerUp: clear,
    onPointerCancel: clear,
    onPointerLeave: clear,
  }
}
