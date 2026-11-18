import { useEffect } from 'react'
import { ACCENTS, FONTS, type DisplayOptions } from '../store/display'

/** 테마·강조색·숫자 글꼴을 문서 루트에 적용 */
export function useAppearance({ theme, accent, font }: Pick<DisplayOptions, 'theme' | 'accent' | 'font'>) {
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') delete root.dataset.theme
    else root.dataset.theme = theme

    // 배경별 강조색: CSS가 테마에 맞는 쪽을 골라 씀 (index.css)
    const { dark, light } = ACCENTS[accent]
    for (const [name, value] of [
      ['--accent-dark', dark],
      ['--accent-light', light],
    ] as const) {
      if (value) root.style.setProperty(name, value)
      else root.style.removeProperty(name)
    }

    const stack = FONTS[font].stack
    if (stack) root.style.setProperty('--num-font', stack)
    else root.style.removeProperty('--num-font')
  }, [theme, accent, font])
}
