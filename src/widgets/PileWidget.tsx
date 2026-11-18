import { useEffect, useMemo, useRef, useState } from 'react'
import { won } from '../format'
import { PERIOD_LABEL, type Widget } from '../layout/widgets'
import {
  breakdown,
  denomLabel,
  denomsFor,
  hourlySlots,
  isCoin,
  planPile,
  recommendedUnit,
  DENOMS,
  type Breakdown,
  type PilePlan,
} from '../pile/money'
import {
  heapCapacity,
  heapPieces,
  metrics,
  neatCapacity,
  neatPieces,
  type Box,
  type PileScene,
} from '../pile/layout'
import { drawPiece, drawSlots, type Theme } from '../pile/draw'
import { playMoney } from '../pile/sound'
import { ACCENTS } from '../store/display'
import { useSettings } from '../store/settings'
import { periodValue } from './period'
import type { Live } from './WidgetView'
import css from './widgets.module.css'

const DROP_MS = 750

function easeOutBounce(x: number): number {
  const n = 7.5625
  const d = 2.75
  if (x < 1 / d) return n * x * x
  if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75
  if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375
  return n * (x -= 2.625 / d) * x + 0.984375
}

const planKey = (p: PilePlan) => p.groups.map((g) => `${g.denom}:${g.crates}/${g.packs}/${g.loose}`).join(',') + `@${p.scale.toFixed(3)}`

function useBox(ref: React.RefObject<HTMLElement | null>): Box | null {
  const [box, setBox] = useState<Box | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const w = Math.round(e.contentRect.width)
      const h = Math.round(e.contentRect.height)
      setBox((b) => (b && b.w === w && b.h === h ? b : { w, h }))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return box
}

/** 🪙 돈 쌓기 위젯: 금액을 동전·지폐로 바꿔 쌓아 보여줌 */
export function PileWidget({ widget, live }: { widget: Widget; live: Live }) {
  const settings = useSettings((s) => s.settings)
  const period = widget.period ?? 'today'
  const money = widget.money ?? 'single'
  const unit = widget.unit ?? recommendedUnit(period)
  const arrange = widget.arrange ?? 'heap'
  const overflow = widget.overflow ?? 'bundle'
  const big = widget.size === 'L'
  const { display } = live

  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const box = useBox(wrapRef)

  const amount = periodValue(live.snap, period).value
  const denoms = denomsFor(money, unit)
  const coinsOnly = denoms.every(isCoin)
  const sec = Math.floor(live.now.getTime() / 1000)

  // 시간별 칸은 1초에 한 번만 다시 계산
  const slots = useMemo(
    () => (arrange === 'hourly' ? hourlySlots(settings, new Date(sec * 1000)) : null),
    [arrange, settings, sec],
  )

  // 배치에 필요한 입력 → 문자열 키 (바뀔 때만 다시 배치)
  const input = (() => {
    if (!box) return null
    const floor = box.h - (arrange === 'hourly' ? (big ? 38 : 22) : 4)
    const area = { w: box.w, h: floor }
    if (arrange === 'hourly' && slots) {
      const n = Math.max(1, slots.length)
      const sw = box.w / n
      const base = metrics(box.w)
      const r = Math.max(4, Math.min(base.r, (sw - 12) / 4.6))
      const m = metrics(box.w, r / base.r)
      const cap = neatCapacity({ w: sw, h: floor }, m, coinsOnly)
      const plans = slots.map((s) =>
        planPile(s.amount, { mode: money, unit, overflow: overflow === 'shrink' ? 'bundle' : overflow, cap }),
      )
      const key = `h|${box.w}x${box.h}|${slots.map((s, i) => `${s.label}:${s.state}:${s.total > 0}:${planKey(plans[i])}`).join(';')}`
      return { key, floor, area, plans, m, sw }
    }
    const capFn = arrange === 'heap' ? heapCapacity : neatCapacity
    const cap = capFn(area, metrics(box.w), coinsOnly)
    const plan = planPile(amount, { mode: money, unit, overflow, cap })
    const key = `${arrange}|${box.w}x${box.h}|${planKey(plan)}`
    return { key, floor, area, plans: [plan], m: metrics(box.w, plan.scale), sw: box.w }
  })()

  const sceneKey = input?.key ?? ''
  const scene: PileScene | null = useMemo(() => {
    if (!input) return null
    if (arrange === 'hourly' && slots) {
      const pieces = input.plans.flatMap((p, i) => {
        const ps = neatPieces(p.groups, { w: input.sw, h: input.floor }, input.m, input.floor, `s${i}:`, 4)
        for (const x of ps) x.x += i * input.sw
        return ps
      })
      const decor = slots.map((s, i) => ({
        x: i * input.sw,
        w: input.sw,
        label: s.label,
        amount: s.state === 'past' ? s.total : 0,
        state: s.state,
        rest: s.total === 0,
      }))
      return { pieces, slots: decor, floor: input.floor }
    }
    const make = arrange === 'heap' ? heapPieces : neatPieces
    return { pieces: make(input.plans[0].groups, input.area, input.m, input.floor), slots: [], floor: input.floor }
    // 배치는 sceneKey가 바뀔 때만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneKey])

  // 지금 칸(또는 기간 전체)에서 다음 1개
  const nowSlot = slots?.findIndex((s) => s.state === 'now') ?? -1
  const nextInfo: Breakdown =
    arrange === 'hourly' && slots && nowSlot >= 0 ? breakdown(slots[nowSlot].amount, denoms) : breakdown(amount, denoms)
  const counts = breakdown(amount, denoms).counts

  /* ── 그리기 ── */
  const seen = useRef<{ reset: string; spawn: Map<string, number> }>({ reset: '', spawn: new Map() })
  const resetKey = `${arrange}|${money}|${unit}|${overflow}|${period}|${box?.w}x${box?.h}`
  const neutral = ACCENTS[display.accent].neutral === true

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv || !box || !scene) return
    const dpr = window.devicePixelRatio || 1
    if (cv.width !== Math.round(box.w * dpr) || cv.height !== Math.round(box.h * dpr)) {
      cv.width = Math.round(box.w * dpr)
      cv.height = Math.round(box.h * dpr)
    }
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const cs = getComputedStyle(cv)
    const theme: Theme = {
      accent: cs.getPropertyValue('--accent').trim() || '#3fd39a',
      muted: cs.getPropertyValue('--muted').trim() || '#888',
      border: cs.getPropertyValue('--border').trim() || '#444',
      text: cs.color,
      font: cs.fontFamily,
    }

    // 새로 생긴 조각만 떨어뜨림 (처음 그릴 때·옵션이 바뀔 때는 그대로)
    const s = seen.current
    const first = s.reset !== resetKey
    if (first) s.spawn.clear()
    s.reset = resetKey
    const motion = display.pileDrop && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t0 = performance.now()
    const keys = new Set<string>()
    let fresh = 0
    let freshCoin = false
    for (const p of scene.pieces) {
      keys.add(p.key)
      if (s.spawn.has(p.key)) continue
      s.spawn.set(p.key, first || !motion ? -Infinity : t0 + Math.min(fresh, 8) * 70)
      if (!first) {
        fresh++
        freshCoin ||= isCoin(p.denom)
      }
    }
    for (const k of s.spawn.keys()) if (!keys.has(k)) s.spawn.delete(k)
    if (fresh > 0 && display.pileSound) playMoney(freshCoin ? 'coin' : 'bill')

    let raf = 0
    const frame = () => {
      const now = performance.now()
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, box.w, box.h)
      if (scene.slots.length) drawSlots(ctx, scene.slots, scene.floor, theme, big)
      ctx.save()
      // 시간별 칸: 바닥 아래 이름 칸에는 안 그려지게
      ctx.beginPath()
      ctx.rect(0, 0, box.w, scene.floor + 2)
      ctx.clip()
      let moving = false
      for (const p of scene.pieces) {
        const at = s.spawn.get(p.key) ?? -Infinity
        const t = (now - at) / DROP_MS
        if (t >= 1) {
          drawPiece(ctx, p, theme.font)
          continue
        }
        moving = true
        if (t < 0) continue
        const dy = (p.y + 40) * (1 - easeOutBounce(t))
        ctx.save()
        ctx.translate(0, -dy)
        drawPiece(ctx, p, theme.font)
        ctx.restore()
      }
      ctx.restore()
      if (moving) raf = requestAnimationFrame(frame)
    }
    frame()
    return () => cancelAnimationFrame(raf)
  }, [scene, box, resetKey, big, display.pileDrop, display.pileSound, display.theme, display.accent, display.font])

  /* ── 위쪽 글자 ── */
  const shown = DENOMS.filter((d) => (counts[d] ?? 0) > 0).sort((a, b) => b - a)
  const summary =
    shown.length === 0
      ? '아직 비어 있어요'
      : shown.map((d) => `${denomLabel(d)} ${(counts[d] ?? 0).toLocaleString('ko-KR')}${isCoin(d) ? '개' : '장'}`).join(' · ')
  const rate = live.snap.ratePerSecond
  const left = rate > 0 ? ((1 - nextInfo.next) * nextInfo.nextDenom) / rate : Infinity
  const pct = Math.floor(nextInfo.next * 100)
  const when =
    live.snap.status !== 'working'
      ? '근무 시간에 쌓여요'
      : left < 60
        ? `${Math.ceil(left)}초 뒤`
        : `약 ${Math.ceil(left / 60)}분 뒤`

  return (
    <div className={css.pile} data-size={widget.size} data-arrange={arrange}>
      {widget.showLabel !== false && (
        <div className={css.pileHead}>
          <span>
            <strong>{arrange === 'hourly' ? '오늘 시간별' : PERIOD_LABEL[period]}</strong> {won(amount)}
            <small>{summary}</small>
          </span>
          <span className={css.pileNext} title={`다음 ${denomLabel(nextInfo.nextDenom)}까지 ${pct}%`}>
            <i
              className={css.nextIcon}
              data-kind={isCoin(nextInfo.nextDenom) ? 'coin' : 'bill'}
              style={{ '--p': `${pct}%` } as React.CSSProperties}
              aria-hidden
            />
            다음 {denomLabel(nextInfo.nextDenom)} {pct}% · {when}
          </span>
        </div>
      )}
      <div ref={wrapRef} className={css.pileStage}>
        <canvas
          ref={canvasRef}
          className={css.pileCanvas}
          style={{ filter: neutral ? 'grayscale(1)' : undefined }}
          role="img"
          aria-label={`${PERIOD_LABEL[period]} ${won(amount)}: ${summary}`}
        />
      </div>
    </div>
  )
}
