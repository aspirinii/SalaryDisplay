import { odometerWheels } from './digits'
import type { SkinProps } from './types'
import css from './skins.module.css'

const STRIP = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0]

function Wheel({ pos, frac }: { pos: number; frac?: boolean }) {
  return (
    <span className={css.wheel} data-frac={frac || undefined}>
      <span className={css.strip} style={{ transform: `translateY(${-pos}em)` }} aria-hidden>
        {STRIP.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </span>
    </span>
  )
}

/** 주행거리계: 자릿수가 세로로 굴러 올라감 */
export function Odometer({ value, digitRate, decimals, size }: SkinProps) {
  const { wheels, intCount } = odometerWheels(value, decimals, digitRate)
  const label = Math.max(0, value).toLocaleString('ko-KR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  const parts: React.ReactNode[] = []
  wheels.forEach((pos, i) => {
    if (i === intCount) parts.push(<span key="dot" className={css.sep}>.</span>)
    const fromRight = intCount - i // 정수부에서 오른쪽부터 몇 번째 자리인지
    if (i > 0 && i < intCount && fromRight % 3 === 0) {
      parts.push(<span key={`c${i}`} className={css.sep}>,</span>)
    }
    parts.push(<Wheel key={i} pos={pos} frac={i >= intCount} />)
  })

  return (
    <div className={css.root} data-size={size} role="img" aria-label={`₩${label}`}>
      <span className={css.currency}>₩</span>
      <span className={css.odometer}>{parts}</span>
    </div>
  )
}
