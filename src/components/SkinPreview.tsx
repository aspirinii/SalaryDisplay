import { useNow } from '../hooks/useNow'
import type { DisplayOptions, SkinId } from '../store/display'
import { Counter } from './Counter'

const PREVIEW_START = Date.now()
const PREVIEW_RATE = 14 // 미리보기: 초당 ₩14 → 바뀌는 모습이 잘 보이게

/** 스킨 고르기용 작은 실시간 미리보기 */
export function SkinPreview({ skin, display }: { skin: SkinId; display: Pick<DisplayOptions, 'decimals' | 'updateMode' | 'step'> }) {
  const now = useNow(display.updateMode === 'continuous' ? 'frame' : 'second')
  const elapsed = (now.getTime() - PREVIEW_START) / 1000
  const value = 128_497.6 + elapsed * PREVIEW_RATE
  const progress = 0.35 + (elapsed % 60) / 100
  return (
    <Counter
      value={value}
      ratePerSecond={PREVIEW_RATE}
      status="working"
      progress={progress}
      options={{ ...display, skin }}
      size="mini"
    />
  )
}
