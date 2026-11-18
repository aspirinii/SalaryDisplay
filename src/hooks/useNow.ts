import { useEffect, useState } from 'react'

/**
 * 현재 시각. 'frame'은 매 프레임(rAF, 탭이 안 보이면 자동 정지),
 * 'second'는 초가 바뀔 때마다 한 번 (저전력).
 */
export function useNow(mode: 'frame' | 'second' = 'frame'): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (mode === 'frame') {
      let id = 0
      const tick = () => {
        setNow(new Date())
        id = requestAnimationFrame(tick)
      }
      id = requestAnimationFrame(tick)
      return () => cancelAnimationFrame(id)
    }
    let id = 0
    const schedule = () => {
      // 다음 정각 초에 맞춰 갱신
      id = window.setTimeout(() => {
        setNow(new Date())
        schedule()
      }, 1000 - (Date.now() % 1000) + 5)
    }
    setNow(new Date())
    schedule()
    return () => clearTimeout(id)
  }, [mode])

  return now
}
