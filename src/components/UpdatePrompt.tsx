import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import css from './UpdatePrompt.module.css'

const CHECK_EVERY_MS = 60 * 60 * 1000 // 계속 켜 두는 화면(Mac mini)도 1시간마다 새 버전 확인
const AUTO_APPLY_SECONDS = 30

/**
 * 새 버전 알림.
 * - 새 버전을 받으면 "새로고침" 알림을 띄우고, 30초 뒤 자동으로 적용
 * - 편집 중·설정 열림·전체화면처럼 바쁠 때는 자동 적용을 미룸 (편집 내용·전체화면 유지)
 * - "나중에"를 누르면 이번에는 자동 적용 안 함 (앱을 다시 열 때 적용)
 */
export function UpdatePrompt({ busy }: { busy: boolean }) {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
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
  const [dismissed, setDismissed] = useState(false)
  const [left, setLeft] = useState(AUTO_APPLY_SECONDS)

  const counting = needRefresh && !dismissed && !busy
  useEffect(() => {
    if (!counting) return
    const id = window.setInterval(() => setLeft((s) => s - 1), 1000)
    return () => clearInterval(id)
  }, [counting])

  useEffect(() => {
    if (counting && left <= 0) void updateServiceWorker(true)
  }, [counting, left, updateServiceWorker])

  if (!needRefresh || dismissed) return null
  return (
    <div className={css.toast} role="status">
      <span>
        새 버전이 나왔어요
        <small>{busy ? '작업이 끝나면 적용돼요' : `${Math.max(0, left)}초 뒤 자동으로 새로고침`}</small>
      </span>
      <button className={css.primary} onClick={() => void updateServiceWorker(true)}>
        지금 새로고침
      </button>
      <button onClick={() => setDismissed(true)}>나중에</button>
    </div>
  )
}
