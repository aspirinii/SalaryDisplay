import { useState } from 'react'
import { digitChars } from './digits'
import type { SkinProps } from './types'
import css from './skins.module.css'

const SPIN = 6 // 멈추기 전에 지나가는 숫자 수

/** 릴 하나. 숫자가 바뀌면 여러 숫자를 빠르게 지나 새 숫자에 멈춤. */
function Reel({ digit, animate }: { digit: string; animate: boolean }) {
  const [state, setState] = useState({ cur: digit, strip: [digit], spins: 0 })
  if (state.cur !== digit) {
    // 이전 숫자 → 무작위 숫자들 → 새 숫자
    const filler = Array.from({ length: SPIN }, () => String(Math.floor(Math.random() * 10)))
    setState({ cur: digit, strip: [state.cur, ...filler, digit], spins: state.spins + 1 })
  }

  if (!animate || state.spins === 0) {
    return <span className={css.reel}>{digit}</span>
  }
  const n = state.strip.length - 1
  return (
    <span className={css.reel}>
      <span
        key={state.spins}
        className={css.reelStrip}
        style={{ '--reel-end': `${-n}em` } as React.CSSProperties}
        aria-hidden
      >
        {state.strip.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </span>
    </span>
  )
}

/** 슬롯머신: 바뀐 자리가 빠르게 돌다 멈춤 */
export function Slot({ value, digitRate, decimals, size }: SkinProps) {
  const chars = digitChars(value, decimals, digitRate)
  const label = '₩' + chars.map((c) => c.ch).join('')
  return (
    <div className={css.root} data-size={size} role="img" aria-label={label}>
      <span className={css.currency}>₩</span>
      <span className={css.slotRow}>
        {chars.map((c, i) =>
          c.place === null ? (
            <span key={`s${i}-${c.ch}`}>{c.ch}</span>
          ) : (
            <span key={`d${c.place}`} className={c.place < 0 ? css.small : undefined}>
              <Reel digit={c.ch} animate={!c.fast} />
            </span>
          ),
        )}
      </span>
    </div>
  )
}
