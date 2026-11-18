import { useState } from 'react'
import { digitChars } from './digits'
import type { SkinProps } from './types'
import css from './skins.module.css'

/** 숫자 카드 하나. 숫자가 바뀌면 위 반쪽이 접히고 아래 반쪽이 내려옴. */
function FlipCard({ digit, animate }: { digit: string; animate: boolean }) {
  // 이전 렌더의 숫자를 기억 (렌더 중 상태 갱신 패턴)
  const [state, setState] = useState({ cur: digit, old: digit, flips: 0 })
  if (state.cur !== digit) setState({ cur: digit, old: state.cur, flips: state.flips + 1 })

  const flipping = animate && state.flips > 0
  return (
    <span className={css.flipCard}>
      <span className={css.flipFace}>{digit}</span>
      {flipping && (
        <span key={state.flips} className={css.flipAnim} aria-hidden>
          <span className={`${css.flipFace} ${css.flipOldBottom}`}>{state.old}</span>
          <span className={`${css.flipFace} ${css.flipOldTop}`}>{state.old}</span>
          <span className={`${css.flipFace} ${css.flipNewBottom}`}>{digit}</span>
        </span>
      )}
    </span>
  )
}

/** 플립 시계: 공항 안내판처럼 자릿수 카드가 뒤집힘 */
export function Flip({ value, digitRate, decimals, size }: SkinProps) {
  const chars = digitChars(value, decimals, digitRate)
  const label = '₩' + chars.map((c) => c.ch).join('')
  return (
    <div className={css.root} data-size={size} role="img" aria-label={label}>
      <span className={css.currency}>₩</span>
      <span className={css.flipRow}>
        {chars.map((c, i) =>
          c.place === null ? (
            <span key={`s${i}-${c.ch}`} className={css.flipSep}>
              {c.ch}
            </span>
          ) : (
            <span key={`d${c.place}`} className={c.place < 0 ? css.small : undefined}>
              <FlipCard digit={c.ch} animate={!c.fast} />
            </span>
          ),
        )}
      </span>
    </div>
  )
}
