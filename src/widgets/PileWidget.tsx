import { useEffect, useMemo, useRef, useState } from 'react'
import { won } from '../format'
import { PERIOD_LABEL, type Widget } from '../layout/widgets'
import {
  breakdown,
  denomLabel,
  denomsFor,
  hourlySlots,
  planPile,
  slotValue,
  recommendedUnit,
  DENOMS,
  type PilePlan,
} from '../pile/money'
import {
  packCost,
  heapCapacity,
  heapPieces,
  metrics,
  neatCapacity,
  neatPieces,
  type Box,
  type PileScene,
} from '../pile/layout'
import { drawPiece, drawSlots, type Theme } from '../pile/draw'
import { sparkle } from '../pile/drawGold'
import { GOLD_NAME, countWord, goldLook, packFor, wonLook, type LookFn } from '../pile/gold'
import { playMoney } from '../pile/sound'
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
  const gold = widget.material === 'gold'
  const goldMap = widget.goldMap ?? 'tenUp'
  const customKey = JSON.stringify(widget.goldCustom ?? {})
  const look: LookFn = useMemo(
    () => (gold ? goldLook(goldMap, JSON.parse(customKey)) : wonLook),
    [gold, goldMap, customKey],
  )
  const lookKey = gold ? `g:${goldMap}:${customKey}` : 'won'
  const goldOpts = { tone: display.goldTone, style: widget.goldStyle ?? display.goldStyle }

  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const box = useBox(wrapRef)

  const amount = periodValue(live.snap, period).value
  const denoms = denomsFor(money, unit)
  const smallest = denoms[denoms.length - 1]
  const smallLook = look(smallest)
  const packOf = (d: (typeof denoms)[number]) => {
    const f = look(d).family
    return { ...packFor(f), cost: packCost(f, arrange !== 'heap') }
  }
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
      // 칸 하나에 칸 두 개(탑 둘 / 피라미드 하나)는 들어가게
      const perR = smallLook.family === 'bar' ? 7.4 * smallLook.scale : 4.6
      const r = Math.max(4, Math.min(base.r, (sw - 12) / perR))
      const m = metrics(box.w, r / base.r)
      const cap = neatCapacity({ w: sw, h: floor }, m, smallLook, smallest)
      const plans = slots.map((s) =>
        planPile(slotValue(s, smallest), {
          mode: money, unit, overflow: overflow === 'shrink' ? 'bundle' : overflow, cap, packOf,
        }),
      )
      const key = `h|${lookKey}|${box.w}x${box.h}|${slots.map((s, i) => `${s.label}:${s.state}:${s.total > 0}:${planKey(plans[i])}`).join(';')}`
      return { key, floor, area, plans, m, sw }
    }
    const capFn = arrange === 'heap' ? heapCapacity : neatCapacity
    const cap = capFn(area, metrics(box.w), smallLook, smallest)
    const plan = planPile(amount, { mode: money, unit, overflow, cap, packOf })
    const key = `${arrange}|${lookKey}|${box.w}x${box.h}|${planKey(plan)}`
    return { key, floor, area, plans: [plan], m: metrics(box.w, plan.scale), sw: box.w }
  })()

  const sceneKey = input?.key ?? ''
  const scene: PileScene | null = useMemo(() => {
    if (!input) return null
    if (arrange === 'hourly' && slots) {
      const pieces = input.plans.flatMap((p, i) => {
        const ps = neatPieces(p.groups, { w: input.sw, h: input.floor }, input.m, input.floor, `s${i}:`, 4, look)
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
    const pieces =
      arrange === 'heap'
        ? heapPieces(input.plans[0].groups, input.area, input.m, input.floor, look)
        : neatPieces(input.plans[0].groups, input.area, input.m, input.floor, '', 8, look)
    return { pieces, slots: [], floor: input.floor }
    // 배치는 sceneKey가 바뀔 때만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneKey])

  // 다음 1개는 기간 전체 금액 기준 (시간별 칸도 같음 → 위젯끼리 같은 순간에 떨어짐)
  const nextInfo = breakdown(amount, denoms)
  const counts = nextInfo.counts

  /* ── 그리기 ── */
  const seen = useRef<{ reset: string; spawn: Map<string, number> }>({ reset: '', spawn: new Map() })
  const resetKey = `${arrange}|${money}|${unit}|${overflow}|${period}|${lookKey}|${box?.w}x${box?.h}`

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
    let freshKind: 'coin' | 'bill' | 'gold' | 'bar' = 'bill'
    for (const p of scene.pieces) {
      keys.add(p.key)
      if (s.spawn.has(p.key)) continue
      s.spawn.set(p.key, first || !motion ? -Infinity : t0 + Math.min(fresh, 8) * 70)
      if (!first) {
        fresh++
        const f = look(p.denom).family
        const kind = f === 'bar' ? 'bar' : f === 'gcoin' || f === 'dust' ? 'gold' : f === 'coin' ? 'coin' : 'bill'
        // 한꺼번에 여러 개면 가장 "무거운" 소리
        const rank = { bill: 0, coin: 1, gold: 2, bar: 3 }
        if (rank[kind] >= rank[freshKind]) freshKind = kind
      }
    }
    for (const k of s.spawn.keys()) if (!keys.has(k)) s.spawn.delete(k)
    if (fresh > 0 && display.pileSound) playMoney(freshKind)

    let tint: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null
    if (display.pileColor === 'accent') {
      const c = document.createElement('canvas')
      c.width = cv.width
      c.height = cv.height
      const cctx = c.getContext('2d')
      if (cctx) tint = { canvas: c, ctx: cctx }
    }

    let raf = 0
    const frame = () => {
      const now = performance.now()
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, box.w, box.h)
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
          drawPiece(ctx, p, theme.font, goldOpts)
          continue
        }
        moving = true
        if (t < 0) continue
        const dy = (p.y + 40) * (1 - easeOutBounce(t))
        ctx.save()
        ctx.translate(0, -dy)
        drawPiece(ctx, p, theme.font, goldOpts)
        ctx.restore()
      }
      ctx.restore()
      if (tint) {
        // 강조색 맞춤: 밝기(입체감)는 두고 색만 강조색으로 → 조각 모양대로 잘라냄
        const copy = tint.canvas
        const cctx = tint.ctx
        cctx.setTransform(1, 0, 0, 1, 0, 0)
        cctx.clearRect(0, 0, copy.width, copy.height)
        cctx.drawImage(cv, 0, 0)
        ctx.save()
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.globalCompositeOperation = 'color'
        ctx.fillStyle = theme.accent
        ctx.fillRect(0, 0, cv.width, cv.height)
        ctx.globalCompositeOperation = 'destination-in'
        ctx.drawImage(copy, 0, 0)
        ctx.restore()
      }
      // 칸 배경·이름은 조각 뒤에 (색 맞춤의 영향 안 받게)
      if (scene.slots.length) {
        ctx.save()
        ctx.globalCompositeOperation = 'destination-over'
        drawSlots(ctx, scene.slots, scene.floor, theme, big)
        ctx.restore()
      }
      if (moving) raf = requestAnimationFrame(frame)
    }
    frame()
    return () => cancelAnimationFrame(raf)
    // goldOpts는 goldOpts.tone·style로 비교
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, box, resetKey, big, look, display.pileDrop, display.pileSound, display.pileColor, display.theme, display.accent, display.font, goldOpts.tone, goldOpts.style])

  /* ── 반짝임 (황금 모드): 위 덮개 캔버스에 가끔 별이 반짝. 저전력·동작 줄이기면 끔 ── */
  const sparkRef = useRef<HTMLCanvasElement>(null)
  const sparkleOn =
    gold && display.pileSparkle && display.updateMode === 'continuous'
  useEffect(() => {
    const cv = sparkRef.current
    if (!cv || !box || !scene || !sparkleOn) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const dpr = window.devicePixelRatio || 1
    cv.width = Math.round(box.w * dpr)
    cv.height = Math.round(box.h * dpr)
    const ctx = cv.getContext('2d')
    if (!ctx) return
    // 위에 보이는 조각(나중에 그려진 쪽)에서 고름
    const top = scene.pieces.slice(Math.floor(scene.pieces.length * 0.5))
    if (!top.length) return
    let raf = 0
    let timer = 0
    const DUR = 700
    const once = () => {
      const p = top[Math.floor(Math.random() * top.length)]
      const size = Math.max(5, Math.min(14, ('r' in p ? p.r : 'w' in p ? p.w / 4 : 8) * 0.8))
      const x = p.x + (Math.random() - 0.5) * size
      const y = p.y - ('h' in p && p.shape === 'bar' ? p.h + p.d * 0.3 : 'k' in p && 'r' in p ? p.r * p.k * 0.4 : size)
      const t0 = performance.now()
      const step = () => {
        const t = (performance.now() - t0) / DUR
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, box.w, box.h)
        if (t < 1) {
          sparkle(ctx, x, y, size, t)
          raf = requestAnimationFrame(step)
        } else timer = window.setTimeout(once, 900 + Math.random() * 1800)
      }
      step()
    }
    timer = window.setTimeout(once, 600)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, cv.width, cv.height)
    }
  }, [scene, box, sparkleOn])

  /* ── 위쪽 글자 ── */
  const shown = DENOMS.filter((d) => (counts[d] ?? 0) > 0).sort((a, b) => b - a)
  // 황금 모드는 금 조각 이름으로 (같은 조각은 합침)
  const nameOf = (d: (typeof DENOMS)[number]) => {
    const g = look(d).gold
    return g ? GOLD_NAME[g] : denomLabel(d)
  }
  const tally = new Map<string, number>()
  for (const d of shown) tally.set(nameOf(d), (tally.get(nameOf(d)) ?? 0) + (counts[d] ?? 0))
  const summary =
    shown.length === 0
      ? '아직 비어 있어요'
      : [...tally]
          .map(([name, n]) => {
            const d = shown.find((x) => nameOf(x) === name)!
            return `${name} ${n.toLocaleString('ko-KR')}${countWord(look(d).family)}`
          })
          .join(' · ')
  const nextName = nameOf(nextInfo.nextDenom)
  const nextFamily = look(nextInfo.nextDenom).family
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
          <span className={css.pileNext} title={`다음 ${nextName}까지 ${pct}%`}>
            <i
              className={css.nextIcon}
              data-kind={nextFamily === 'bill' || nextFamily === 'bar' ? 'bill' : 'coin'}
              data-gold={gold || undefined}
              style={{ '--p': `${pct}%` } as React.CSSProperties}
              aria-hidden
            />
            다음 {nextName}
            {gold && <small className={css.nextWon}>({denomLabel(nextInfo.nextDenom)})</small>} {pct}% · {when}
          </span>
        </div>
      )}
      <div ref={wrapRef} className={css.pileStage}>
        <canvas
          ref={canvasRef}
          className={css.pileCanvas}
          role="img"
          aria-label={`${PERIOD_LABEL[period]} ${won(amount)}: ${summary}`}
        />
        {sparkleOn && <canvas ref={sparkRef} className={css.pileCanvas} aria-hidden />}
      </div>
    </div>
  )
}
