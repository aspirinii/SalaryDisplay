import { CountUp } from './CountUp'
import type { SkinProps } from './types'
import css from './skins.module.css'

/** 물통: 이 기간 목표(전체 근무 시 금액) 대비 물이 차오름 */
export function Tank(props: SkinProps) {
  const { progress, size, status } = props
  const pct = Math.round(progress * 1000) / 10
  return (
    <div className={css.tank} data-size={size} data-status={status}>
      <div className={css.water} style={{ height: `${progress * 100}%` }} aria-hidden>
        <span className={css.wave} />
        <span className={`${css.wave} ${css.wave2}`} />
      </div>
      <div className={css.tankContent}>
        <CountUp {...props} />
        <span className={css.tankPct}>{pct.toFixed(1)}%</span>
      </div>
    </div>
  )
}
