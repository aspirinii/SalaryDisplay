import { useEffect, useRef, useState } from 'react'

const easeOut = (t: number) => 1 - (1 - t) ** 3

/**
 * 목표값이 뛸 때 이전 값에서 부드럽게 따라가는 값.
 * duration이 0이면 그대로 반환 (연속 모드).
 */
export function useTweened(target: number, duration: number): number {
  const [shown, setShown] = useState(target)
  const from = useRef(target)
  const shownRef = useRef(target)

  useEffect(() => {
    if (duration <= 0) {
      shownRef.current = target
      return
    }
    from.current = shownRef.current
    // 큰 점프(설정 변경 등)나 감소는 애니메이션 없이 바로
    if (target < from.current || target - from.current > Math.max(1, Math.abs(target)) * 0.5) {
      shownRef.current = target
      setShown(target)
      return
    }
    const start = performance.now()
    let id = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration)
      const v = from.current + (target - from.current) * easeOut(k)
      shownRef.current = v
      setShown(v)
      if (k < 1) id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [target, duration])

  return duration <= 0 ? target : shown
}
