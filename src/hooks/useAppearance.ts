import { useEffect } from 'react'
import { ACCENTS, FONTS, type DisplayOptions } from '../store/display'

/** 테마·강조색·숫자 글꼴을 문서 루트에 적용 */
export function useAppearance({ theme, accent, font }: Pick<DisplayOptions, 'theme' | 'accent' | 'font'>) {
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') delete root.dataset.theme
    else root.dataset.theme = theme

    const color = ACCENTS[accent].color
    // 고대비 테마는 자체 강조색 유지
    if (color && theme !== 'contrast') root.style.setProperty('--accent', color)
    else root.style.removeProperty('--accent')

    const stack = FONTS[font].stack
    if (stack) root.style.setProperty('--num-font', stack)
    else root.style.removeProperty('--num-font')
  }, [theme, accent, font])
}
