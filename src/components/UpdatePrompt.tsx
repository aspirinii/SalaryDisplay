import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import css from './UpdatePrompt.module.css'

const CHECK_EVERY_MS = 60 * 60 * 1000 // 계속 켜 두는 화면(Mac mini)도 1시간마다 새 버전 확인
const AUTO_APPLY_SECONDS = 30

/**
 * 새 버전 알림.
 * 서비스 워커는 새 버전을 받는 즉시 넘겨받음(skipWaiting) → 지금 화면만 옛 코드로 남음.
 * 그 순간 알림을 띄우고 30초 뒤 새로고침. 편집 중·설정 열림·전체화면·첫 안내 중이면 미룸.
 * "나중에"를 누르면 이번에는 자동 새로고침 안 함 (다음에 열 때 새 버전).
 */
export function UpdatePrompt({ busy }: { busy: boolean }) {
  // 처음 방문(아직 서비스 워커 없음)에 넘겨받는 것은 업데이트가 아님
  const [hadController] = useState(() => 'serviceWorker' in navigator && navigator.serviceWorker.controller !== null)
  const [updated, setUpdated] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [left, setLeft] = useState(AUTO_APPLY_SECONDS)

  useRegisterSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const check = () => {
        if (navigator.onLine) void registration.update().catch(() => {})
      }
      window.setInterval(check, CHECK_EVERY_MS)
      document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check())
    },
  })

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !hadController) return
    const onChange = () => setUpdated(true)
    navigator.serviceWorker.addEventListener('controllerchange', onChange)
    return () => navigator.serviceWorker.removeEventListener('controllerchange', onChange)
  }, [hadController])

  const counting = updated && !dismissed && !busy
  useEffect(() => {
    if (!counting) return
    const id = window.setInterval(() => setLeft((s) => s - 1), 1000)
    return () => clearInterval(id)
  }, [counting])

  useEffect(() => {
    if (counting && left <= 0) window.location.reload()
  }, [counting, left])

  if (!updated || dismissed) return null
  return (
    <div className={css.toast} role="status">
      <span>
        새 버전이 나왔어요
        <small>{busy ? '작업이 끝나면 적용돼요' : `${Math.max(0, left)}초 뒤 자동으로 새로고침`}</small>
      </span>
      <button className={css.primary} onClick={() => window.location.reload()}>
        지금 새로고침
      </button>
      <button onClick={() => setDismissed(true)}>나중에</button>
    </div>
  )
}
