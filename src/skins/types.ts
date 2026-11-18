import type { WorkStatus } from '../engine'

/** 모든 스킨이 받는 공통 입력. 스킨은 그리기만 담당. */
export interface SkinProps {
  /** 표시할 금액 (업데이트 모드·트윈 적용 후) */
  value: number
  /** 실제 초당 단가 (Floating +₩ 등 표시용) */
  ratePerSecond: number
  /**
   * 화면 숫자가 초당 얼마씩 바뀌는지. 자리별 애니메이션 여부 판단에 사용.
   * 연속 모드 = ratePerSecond, 끊는 모드(트윈) = 0 → 모든 자리 애니메이션
   */
  digitRate: number
  status: WorkStatus
  decimals: number
  /** 이 기간 전체 금액 대비 진행률 0~1 */
  progress: number
  /** 'hero' = 크게, 'card' = 보통, 'mini' = 미리보기 */
  size: 'hero' | 'card' | 'mini'
}
