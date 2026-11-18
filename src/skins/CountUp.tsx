import type { SkinProps } from './types'
import css from './skins.module.css'

/** 기본 카운트업: 숫자가 그대로 올라감 */
export function CountUp({ value, decimals, size }: SkinProps) {
  const text = Math.max(0, value).toLocaleString('ko-KR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  const dot = text.lastIndexOf('.')
  return (
    <div className={css.root} data-size={size}>
      <span className={css.currency}>₩</span>
      {dot === -1 ? (
        text
      ) : (
        <>
          {text.slice(0, dot)}
          <span className={css.frac}>{text.slice(dot)}</span>
        </>
      )}
    </div>
  )
}
