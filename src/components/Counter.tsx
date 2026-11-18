import type { WorkStatus } from '../engine'
import { quantize } from '../skins/digits'
import { skinById } from '../skins/registry'
import { useTweened } from '../hooks/useTweened'
import type { DisplayOptions, SkinId } from '../store/display'

/** 카운터가 쓰는 옵션: 위젯별 스킨·소수점 + 전역 갱신 방식 */
export type CounterOptions = Pick<DisplayOptions, 'decimals' | 'updateMode' | 'step'> & { skin: SkinId }

interface Props {
  value: number
  ratePerSecond: number
  status: WorkStatus
  progress: number
  options: CounterOptions
  size: 'hero' | 'card' | 'mini'
}

/** 업데이트 모드(단위 끊기·트윈)를 적용하고 선택된 스킨으로 그림 */
export function Counter({ value, ratePerSecond, status, progress, options, size }: Props) {
  const target = quantize(value, options.updateMode, options.step)
  const continuous = options.updateMode === 'continuous'
  const shown = useTweened(target, continuous ? 0 : 450)
  const Skin = skinById(options.skin).component
  return (
    <Skin
      value={shown}
      ratePerSecond={ratePerSecond}
      digitRate={continuous ? ratePerSecond : 0}
      status={status}
      decimals={options.decimals}
      progress={Math.min(1, Math.max(0, progress))}
      size={size}
    />
  )
}
