import { useEffect, useRef, useState } from 'react'

/**
 * value가 unit 단위를 새로 넘으면 넘은 금액을 잠시 반환 (그 외 null).
 * 처음 화면을 열 때나 설정을 바꿔 값이 뛰어오를 때는 축하하지 않음.
 */
export function useMilestone(value: number, unit: number, enabled: boolean, showMs = 3500): number | null {
  const level = Math.floor(value / unit)
  const prev = useRef<{ level: number; unit: number } | null>(null)
  const [hit, setHit] = useState<number | null>(null)

  useEffect(() => {
    const p = prev.current
    prev.current = { level, unit }
    // 한 단계만 올라간 경우만 (큰 점프 = 설정 변경)
    if (enabled && p && p.unit === unit && level === p.level + 1) setHit(level * unit)
  }, [level, unit, enabled])

  useEffect(() => {
    if (hit === null) return
    const id = window.setTimeout(() => setHit(null), showMs)
    return () => clearTimeout(id)
  }, [hit, showMs])

  return enabled ? hit : null
}
