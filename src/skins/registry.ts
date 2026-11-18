import type { ComponentType } from 'react'
import type { SkinId } from '../store/display'
import type { SkinProps } from './types'
import { CountUp } from './CountUp'
import { Odometer } from './Odometer'
import { Flip } from './Flip'
import { Slot } from './Slot'
import { Floating } from './Floating'
import { Tank } from './Tank'

export interface SkinMeta {
  id: SkinId
  name: string
  description: string
  component: ComponentType<SkinProps>
}

/** 새 스킨은 여기에 추가 */
export const SKINS: SkinMeta[] = [
  { id: 'odometer', name: '주행거리계', description: '자릿수가 굴러 올라감', component: Odometer },
  { id: 'countup', name: '카운트업', description: '숫자가 그대로 증가', component: CountUp },
  { id: 'flip', name: '플립 시계', description: '안내판처럼 카드가 뒤집힘', component: Flip },
  { id: 'slot', name: '슬롯머신', description: '바뀐 자리가 돌다 멈춤', component: Slot },
  { id: 'floating', name: '떠오르는 +₩', description: '1초마다 번 돈이 떠오름', component: Floating },
  { id: 'tank', name: '물통', description: '기간 전체 대비 물이 차오름', component: Tank },
]

export const skinById = (id: SkinId): SkinMeta => SKINS.find((s) => s.id === id) ?? SKINS[0]
