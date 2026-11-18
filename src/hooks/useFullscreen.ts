import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 전체화면(대시보드) 모드.
 * - Fullscreen API를 지원하면 실제 전체화면, 아니면(iOS Safari 등) 화면 안에서만 몰입 모드
 * - 켜져 있는 동안 화면 꺼짐 방지(Wake Lock, 지원 시)
 */
export function useFullscreen() {
  const [active, setActive] = useState(false)
  const activeRef = useRef(active)
  useEffect(() => {
    activeRef.current = active
  }, [active])

  // 실제 전체화면에서 (Esc 등으로) 빠져나오면 몰입 모드도 끔
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setActive(false)
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // 몰입 모드는 즉시 켜고, 실제 전체화면은 되면 좋은 정도로만 요청.
  // (일부 WebView는 requestFullscreen이 끝나지 않거나 거부됨)
  const toggle = useCallback(async () => {
    if (document.fullscreenElement) {
      setActive(false)
      await document.exitFullscreen().catch(() => {})
      return
    }
    const turningOn = !activeRef.current
    setActive(turningOn)
    const el = document.documentElement
    if (turningOn && document.fullscreenEnabled && el.requestFullscreen) {
      await el.requestFullscreen().catch(() => {})
    }
  }, [])

  // 몰입 모드(대체)일 때 Esc로 나가기
  useEffect(() => {
    if (!active || document.fullscreenElement) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setActive(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  // 화면 꺼짐 방지
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
        if (cancelled) void lock.release()
      } catch {
        /* 배터리 절약 모드 등에서 거부될 수 있음 */
      }
    }
    // 탭이 다시 보이면 잠금이 풀려 있으므로 다시 요청
    const onVisible = () => document.visibilityState === 'visible' && void acquire()
    void acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release()
    }
  }, [active])

  return { active, toggle }
}

/** 마우스를 일정 시간 안 움직이면 true (커서·버튼 숨김용) */
export function useIdle(enabled: boolean, ms = 2500): boolean {
  const [idle, setIdle] = useState(false)
  useEffect(() => {
    if (!enabled) return
    let id = window.setTimeout(() => setIdle(true), ms)
    const wake = () => {
      setIdle(false)
      clearTimeout(id)
      id = window.setTimeout(() => setIdle(true), ms)
    }
    window.addEventListener('pointermove', wake)
    window.addEventListener('pointerdown', wake)
    window.addEventListener('keydown', wake)
    return () => {
      clearTimeout(id)
      window.removeEventListener('pointermove', wake)
      window.removeEventListener('pointerdown', wake)
      window.removeEventListener('keydown', wake)
      setIdle(false)
    }
  }, [enabled, ms])
  return enabled && idle
}
