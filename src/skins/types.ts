import type { WorkStatus } from '../engine'

/** 모든 스킨이 받는 공통 입력. 스킨은 그리기만 담당. */
export interface SkinProps {
  /** 표시할 금액 (업데이트 모드·트윈 적용 후) */
  value: number
  ratePerSecond: number
  status: WorkStatus
  decimals: number
  /** 'hero' = 크게, 'card' = 보통, 'mini' = 미리보기 */
  size: 'hero' | 'card' | 'mini'
}
