import type { ComponentType } from 'react'
import type { SkinId } from '../store/display'
import type { SkinProps } from './types'
import { CountUp } from './CountUp'
import { Odometer } from './Odometer'

export interface SkinMeta {
  id: SkinId
  name: string
  description: string
  component: ComponentType<SkinProps>
}

/** 새 스킨은 여기에 추가 (M4: Flip, Slot, Floating, Progress …) */
export const SKINS: SkinMeta[] = [
  { id: 'odometer', name: '주행거리계', description: '자릿수가 굴러 올라감', component: Odometer },
  { id: 'countup', name: '카운트업', description: '숫자가 그대로 증가', component: CountUp },
]

export const skinById = (id: SkinId): SkinMeta => SKINS.find((s) => s.id === id) ?? SKINS[0]
