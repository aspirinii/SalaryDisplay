import { useEffect, useState } from 'react'
import { CountUp } from './CountUp'
import type { SkinProps } from './types'
import css from './skins.module.css'

interface Floater {
  id: number
  x: number
  text: string
}

let nextId = 0

/** 기본 숫자 위로 1초마다 "+₩4.96"이 떠올랐다 사라짐 */
export function Floating(props: SkinProps) {
  const { ratePerSecond, status, size } = props
  const [floaters, setFloaters] = useState<Floater[]>([])

  useEffect(() => {
    if (status !== 'working' || ratePerSecond <= 0) return
    const digits = ratePerSecond < 10 ? 2 : 0
    const text = '+₩' + ratePerSecond.toLocaleString('ko-KR', { minimumFractionDigits: digits, maximumFractionDigits: digits })
    const id = window.setInterval(() => {
      setFloaters((fs) => [...fs.slice(-6), { id: nextId++, x: 10 + Math.random() * 70, text }])
    }, 1000)
    return () => clearInterval(id)
  }, [status, ratePerSecond])

  return (
    <div className={css.floatWrap} data-size={size}>
      <CountUp {...props} />
      <div className={css.floatLayer} aria-hidden>
        {floaters.map((f) => (
          <span
            key={f.id}
            className={css.floater}
            style={{ left: `${f.x}%` }}
            onAnimationEnd={() => setFloaters((fs) => fs.filter((x) => x.id !== f.id))}
          >
            {f.text}
          </span>
        ))}
      </div>
    </div>
  )
}
