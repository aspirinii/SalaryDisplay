import type { WorkStatus } from '../engine'
import { quantize } from '../skins/digits'
import { skinById } from '../skins/registry'
import { useTweened } from '../hooks/useTweened'
import type { DisplayOptions } from '../store/display'

interface Props {
  value: number
  ratePerSecond: number
  status: WorkStatus
  options: DisplayOptions
  size: 'hero' | 'card' | 'mini'
}

/** 업데이트 모드(단위 끊기·트윈)를 적용하고 선택된 스킨으로 그림 */
export function Counter({ value, ratePerSecond, status, options, size }: Props) {
  const target = quantize(value, options.updateMode, options.step)
  const shown = useTweened(target, options.updateMode === 'continuous' ? 0 : 450)
  const Skin = skinById(options.skin).component
  // 연속 모드에서는 진짜 초당 단가로, 끊는 모드에서는 트윈 중이라 연속 회전 허용
  const rate = options.updateMode === 'continuous' ? ratePerSecond : 0
  return <Skin value={shown} ratePerSecond={rate} status={status} decimals={options.decimals} size={size} />
}
