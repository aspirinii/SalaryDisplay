/**
 * 황금 모드 그림: 금화·사금·골드바·금화 주머니·보물상자·금고.
 * 금화 문양과 바 각인은 실제 금화·제련소를 떠올리게 하는 모티프만 쓰고,
 * 실제 도안·로고·이름은 쓰지 않음 (이름은 가상의 "SALARY MINT").
 */
import type { GoldPiece, GoldStyle, GoldTone } from './gold'
import type { Piece } from './layout'

interface Palette {
  hi: string
  mid: string
  base: string
  dark: string
  ink: string
}

export const GOLD_PALETTE: Record<GoldTone, Palette> = {
  gold: { hi: '#fff4c2', mid: '#f3cb4f', base: '#d6a21e', dark: '#93660a', ink: '#7c5306' },
  rose: { hi: '#ffe6dc', mid: '#efb59c', base: '#d48c71', dark: '#985744', ink: '#7a4232' },
  white: { hi: '#ffffff', mid: '#efeee9', base: '#d2d0c9', dark: '#8c8981', ink: '#64615a' },
}

export interface GoldOpts {
  tone: GoldTone
  style: GoldStyle
  font: string
}

const BAR_WEIGHT: Partial<Record<GoldPiece, string>> = { miniBar: '10g', bar: '100g', ingot: '1kg' }

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/* ───────────── 금화 문양 (지름 1 기준, 가운데 0,0) ───────────── */

function poly(ctx: CanvasRenderingContext2D, pts: number[][], s: number) {
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * s, y * s) : ctx.moveTo(x * s, y * s)))
  ctx.closePath()
  ctx.fill()
}

const EAGLE = [
  [-1, -0.35], [-0.55, -0.02], [-0.28, -0.22], [-0.1, -0.05], [0, -0.32], [0.1, -0.05], [0.28, -0.22],
  [0.55, -0.02], [1, -0.35], [0.62, 0.22], [0.22, 0.18], [0.14, 0.42], [0.3, 0.7], [0, 0.55], [-0.3, 0.7],
  [-0.14, 0.42], [-0.22, 0.18], [-0.62, 0.22],
]
const MAPLE = [
  [0, -1], [0.15, -0.6], [0.45, -0.75], [0.38, -0.35], [0.85, -0.45], [0.6, -0.05], [0.75, 0.1], [0.3, 0.15],
  [0.35, 0.45], [0.06, 0.3], [0.04, 0.9], [-0.04, 0.9], [-0.06, 0.3], [-0.35, 0.45], [-0.3, 0.15], [-0.75, 0.1],
  [-0.6, -0.05], [-0.85, -0.45], [-0.38, -0.35], [-0.45, -0.75], [-0.15, -0.6],
]
// 뛰어오르는 산양 (옆모습)
const IBEX = [
  [-0.75, 0.05], [-0.45, -0.1], [0.2, -0.12], [0.42, -0.35], [0.5, -0.5], [0.62, -0.45], [0.6, -0.28],
  [0.7, -0.18], [0.45, -0.05], [0.35, 0.12], [0.6, 0.45], [0.48, 0.5], [0.22, 0.2], [-0.25, 0.18],
  [-0.55, 0.52], [-0.68, 0.46], [-0.48, 0.15],
]

function motif(ctx: CanvasRenderingContext2D, style: GoldStyle, R: number, pal: Palette, font: string) {
  ctx.fillStyle = pal.ink
  ctx.strokeStyle = pal.ink
  ctx.globalAlpha = 0.7
  switch (style) {
    case 'basic': {
      ctx.font = `800 ${Math.round(R * 1.15)}px ${font}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('₩', 0, R * 0.06)
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        ctx.beginPath()
        ctx.arc(Math.cos(a) * R * 0.92, Math.sin(a) * R * 0.92, Math.max(0.6, R * 0.06), 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    case 'eagle':
      poly(ctx, EAGLE, R * 0.85)
      break
    case 'maple':
      poly(ctx, MAPLE, R * 0.85)
      break
    case 'ibex':
      poly(ctx, IBEX, R)
      // 뿔
      ctx.lineWidth = Math.max(1, R * 0.1)
      ctx.beginPath()
      ctx.arc(0.3 * R, -0.5 * R, R * 0.3, -0.3, Math.PI * 0.9, true)
      ctx.stroke()
      break
    case 'korean': {
      // 무궁화: 꽃잎 5장
      for (let i = 0; i < 5; i++) {
        ctx.save()
        ctx.rotate((i / 5) * Math.PI * 2)
        ctx.beginPath()
        ctx.ellipse(0, -R * 0.45, R * 0.3, R * 0.45, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
      ctx.globalAlpha = 1
      ctx.fillStyle = pal.hi
      ctx.beginPath()
      ctx.arc(0, 0, R * 0.18, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'refinery': {
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `800 ${Math.round(R * 0.7)}px ${font}`
      ctx.fillText('SM', 0, -R * 0.12)
      ctx.font = `600 ${Math.round(R * 0.32)}px ${font}`
      ctx.fillText('999.9', 0, R * 0.48)
      break
    }
  }
  ctx.globalAlpha = 1
}

/* ───────────── 조각 ───────────── */

export function goldCoin(ctx: CanvasRenderingContext2D, p: Extract<Piece, { shape: 'coin' }>, o: GoldOpts) {
  const pal = GOLD_PALETTE[o.tone]
  const ry = p.r * p.k
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.rot)
  // 옆면 + 톱니
  ctx.fillStyle = pal.dark
  ctx.beginPath()
  ctx.ellipse(0, p.t, p.r, ry, 0, 0, Math.PI)
  ctx.lineTo(-p.r, 0)
  ctx.ellipse(0, 0, p.r, ry, 0, Math.PI, 0, true)
  ctx.closePath()
  ctx.fill()
  if (p.r >= 8) {
    ctx.strokeStyle = pal.base
    ctx.lineWidth = 1
    for (let a = 0.15; a < Math.PI; a += 0.32) {
      const x = Math.cos(a) * p.r
      const y = Math.sin(a) * ry
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x, y + p.t)
      ctx.stroke()
    }
  }
  // 윗면
  const g = ctx.createRadialGradient(-p.r * 0.35, -ry * 0.5, p.r * 0.1, 0, 0, p.r)
  g.addColorStop(0, pal.hi)
  g.addColorStop(0.55, pal.mid)
  g.addColorStop(1, pal.base)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(0, 0, p.r, ry, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = pal.dark
  ctx.lineWidth = Math.max(0.8, p.r * 0.07)
  ctx.beginPath()
  ctx.ellipse(0, 0, p.r * 0.86, ry * 0.86, 0, 0, Math.PI * 2)
  ctx.stroke()
  if (p.face && p.r >= 8) {
    ctx.scale(1, p.k)
    motif(ctx, o.style, p.r * 0.62, pal, o.font)
  }
  ctx.restore()
}

export function dust(ctx: CanvasRenderingContext2D, p: Extract<Piece, { shape: 'dust' }>, o: GoldOpts) {
  const pal = GOLD_PALETTE[o.tone]
  let a = p.seed
  const rand = () => {
    a = (a * 1103515245 + 12345) & 0x7fffffff
    return a / 0x7fffffff
  }
  ctx.save()
  ctx.translate(p.x, p.y)
  const n = 7
  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2
    const rr = p.r * (0.7 + rand() * 0.45)
    const x = Math.cos(ang) * rr
    const y = Math.sin(ang) * rr * 0.6
    if (i) ctx.lineTo(x, y)
    else ctx.moveTo(x, y)
  }
  ctx.closePath()
  const g = ctx.createRadialGradient(-p.r * 0.3, -p.r * 0.3, 0, 0, 0, p.r)
  g.addColorStop(0, pal.hi)
  g.addColorStop(0.6, pal.mid)
  g.addColorStop(1, pal.dark)
  ctx.fillStyle = g
  ctx.fill()
  ctx.restore()
}

export function bar(ctx: CanvasRenderingContext2D, p: Extract<Piece, { shape: 'bar' }>, o: GoldOpts) {
  const pal = GOLD_PALETTE[o.tone]
  const top = p.w * 0.45 // 윗면 반폭
  const back = p.w * 0.39
  const dd = p.d * 0.55
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.rot)
  // 앞면 (사다리꼴)
  const fg = ctx.createLinearGradient(0, -p.h, 0, 0)
  fg.addColorStop(0, pal.base)
  fg.addColorStop(1, pal.dark)
  ctx.fillStyle = fg
  ctx.beginPath()
  ctx.moveTo(-p.w / 2, 0)
  ctx.lineTo(p.w / 2, 0)
  ctx.lineTo(top, -p.h)
  ctx.lineTo(-top, -p.h)
  ctx.closePath()
  ctx.fill()
  // 옆면 (오른쪽)
  ctx.fillStyle = pal.dark
  ctx.beginPath()
  ctx.moveTo(p.w / 2, 0)
  ctx.lineTo(p.w / 2 - (p.w / 2 - back) * 0.4, -dd * 0.5)
  ctx.lineTo(back, -p.h - dd)
  ctx.lineTo(top, -p.h)
  ctx.closePath()
  ctx.fill()
  // 윗면
  const tg = ctx.createLinearGradient(-top, -p.h - dd, top, -p.h)
  tg.addColorStop(0, pal.hi)
  tg.addColorStop(0.5, pal.mid)
  tg.addColorStop(1, pal.base)
  ctx.fillStyle = tg
  ctx.beginPath()
  ctx.moveTo(-top, -p.h)
  ctx.lineTo(top, -p.h)
  ctx.lineTo(back, -p.h - dd)
  ctx.lineTo(-back, -p.h - dd)
  ctx.closePath()
  ctx.fill()
  // 각인
  if (p.face && p.w >= 30) {
    const cy = -p.h - dd / 2
    ctx.fillStyle = pal.ink
    ctx.strokeStyle = pal.ink
    ctx.globalAlpha = 0.7
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const fs = Math.max(6, dd * 0.36)
    const weight = BAR_WEIGHT[p.gold] ?? ''
    if (o.style === 'refinery' && p.w >= 44) {
      // 실제 제련 바처럼: 테두리 칸 + 이름(가상) + 순도·무게 + 일련번호
      ctx.lineWidth = 0.8
      ctx.strokeRect(-back * 0.85, -p.h - dd * 0.92, back * 1.7, dd * 0.84)
      ctx.font = `700 ${Math.round(fs * 0.75)}px ${o.font}`
      ctx.fillText('SALARY MINT', 0, cy - fs * 0.6)
      ctx.font = `800 ${Math.round(fs)}px ${o.font}`
      ctx.fillText(`${weight} 999.9`, 0, cy + fs * 0.25)
      ctx.font = `500 ${Math.round(fs * 0.6)}px ${o.font}`
      ctx.fillText(`No.${String(hash(p.key) % 1e6).padStart(6, '0')}`, 0, cy + fs * 0.95)
    } else {
      ctx.font = `800 ${Math.round(fs)}px ${o.font}`
      ctx.fillText(weight ? `${weight} · 999.9` : '999.9', 0, cy)
    }
    ctx.globalAlpha = 1
  }
  ctx.restore()
}

/** 금화 주머니 (×100) */
export function goldBag(ctx: CanvasRenderingContext2D, p: Extract<Piece, { shape: 'bag' }>, o: GoldOpts) {
  const pal = GOLD_PALETTE[o.tone]
  const r = p.r
  ctx.save()
  ctx.translate(p.x, p.y)
  // 주머니 (짙은 붉은 천)
  const g = ctx.createLinearGradient(-r, 0, r, 0)
  g.addColorStop(0, '#5e1f24')
  g.addColorStop(0.5, '#8a3138')
  g.addColorStop(1, '#4f191d')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(-r * 0.95, 0)
  ctx.quadraticCurveTo(-r * 1.2, -r * 1.05, -r * 0.4, -r * 1.4)
  ctx.lineTo(r * 0.4, -r * 1.4)
  ctx.quadraticCurveTo(r * 1.2, -r * 1.05, r * 0.95, 0)
  ctx.closePath()
  ctx.fill()
  // 위로 보이는 금화
  for (const [dx, dy] of [[-0.25, -1.45], [0.2, -1.5], [0, -1.62]]) {
    ctx.fillStyle = pal.mid
    ctx.strokeStyle = pal.dark
    ctx.beginPath()
    ctx.ellipse(dx * r, dy * r, r * 0.32, r * 0.14, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
  // 금색 끈
  ctx.strokeStyle = pal.base
  ctx.lineWidth = Math.max(1.5, r * 0.12)
  ctx.beginPath()
  ctx.moveTo(-r * 0.45, -r * 1.3)
  ctx.quadraticCurveTo(0, -r * 1.15, r * 0.45, -r * 1.3)
  ctx.stroke()
  if (r >= 9) {
    ctx.fillStyle = pal.mid
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `800 ${Math.round(r * 0.42)}px ${o.font}`
    ctx.fillText('×100', 0, -r * 0.55)
  }
  ctx.restore()
}

/** 보물상자 (×1,000) — 금화가 넘쳐 흐름 */
export function chest(ctx: CanvasRenderingContext2D, p: Extract<Piece, { shape: 'chest' }>, o: GoldOpts) {
  const pal = GOLD_PALETTE[o.tone]
  const w = p.w
  const h = w * 0.5
  ctx.save()
  ctx.translate(p.x, p.y)
  // 넘쳐 흐르는 금화 (상자 뒤·위)
  for (let i = 0; i < 9; i++) {
    const x = (((i * 37) % 9) / 8 - 0.5) * w * 0.8
    const y = -h - w * 0.06 - ((i * 13) % 4) * w * 0.035
    ctx.fillStyle = i % 2 ? pal.mid : pal.base
    ctx.strokeStyle = pal.dark
    ctx.beginPath()
    ctx.ellipse(x, y, w * 0.11, w * 0.045, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
  // 몸통 (나무)
  ctx.fillStyle = '#6e4220'
  ctx.fillRect(-w / 2, -h, w, h)
  ctx.fillStyle = '#5a3418'
  for (let y = -h + h * 0.33; y < 0; y += h * 0.33) ctx.fillRect(-w / 2, y, w, 1)
  // 금 띠
  ctx.fillStyle = pal.base
  ctx.fillRect(-w / 2, -h, w * 0.08, h)
  ctx.fillRect(w / 2 - w * 0.08, -h, w * 0.08, h)
  ctx.fillRect(-w / 2, -h, w, h * 0.12)
  // 열린 뚜껑 (뒤로 젖힘)
  ctx.fillStyle = '#7d4c26'
  ctx.beginPath()
  ctx.moveTo(-w / 2, -h)
  ctx.lineTo(w / 2, -h)
  ctx.lineTo(w * 0.46, -h - w * 0.32)
  ctx.quadraticCurveTo(0, -h - w * 0.42, -w * 0.46, -h - w * 0.32)
  ctx.closePath()
  ctx.globalCompositeOperation = 'destination-over'
  ctx.fill()
  ctx.globalCompositeOperation = 'source-over'
  // 자물쇠
  ctx.fillStyle = pal.mid
  ctx.fillRect(-w * 0.06, -h * 0.75, w * 0.12, h * 0.3)
  if (w >= 40) {
    ctx.fillStyle = pal.hi
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `800 ${Math.round(w * 0.11)}px ${o.font}`
    ctx.fillText('×1,000', 0, -h * 0.28)
  }
  ctx.restore()
}

/** 금고 (골드바 ×10 / 큰 금고 ×100) — 문이 열려 안에 바가 보임 */
export function safe(ctx: CanvasRenderingContext2D, p: Extract<Piece, { shape: 'safe' }>, o: GoldOpts) {
  const pal = GOLD_PALETTE[o.tone]
  const w = p.w
  const h = w * 0.8
  ctx.save()
  ctx.translate(p.x, p.y)
  // 몸통
  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0)
  g.addColorStop(0, '#4b5057')
  g.addColorStop(1, '#6d737b')
  ctx.fillStyle = g
  ctx.fillRect(-w / 2, -h, w, h)
  // 안쪽
  const ix = -w * 0.42
  const iw = w * 0.62
  const iy = -h * 0.88
  const ih = h * 0.76
  ctx.fillStyle = '#25282c'
  ctx.fillRect(ix, iy, iw, ih)
  // 안의 골드바 (선반 2칸)
  const bw = iw * 0.42
  const bh = ih * 0.16
  for (let row = 0; row < 2; row++) {
    const by = iy + ih * (row ? 0.92 : 0.45)
    for (let i = 0; i < 2; i++) {
      const bx = ix + iw * 0.06 + i * (bw + iw * 0.06)
      ctx.fillStyle = pal.base
      ctx.fillRect(bx, by - bh, bw, bh)
      ctx.fillStyle = pal.mid
      ctx.fillRect(bx + bw * 0.08, by - bh - bh * 0.4, bw * 0.84, bh * 0.4)
    }
    ctx.fillStyle = '#3b3f45'
    ctx.fillRect(ix, by, iw, 1.5)
  }
  // 열린 문 (오른쪽)
  ctx.fillStyle = '#7a8189'
  ctx.beginPath()
  ctx.moveTo(w * 0.22, -h)
  ctx.lineTo(w * 0.5, -h * 1.06)
  ctx.lineTo(w * 0.5, h * 0.02)
  ctx.lineTo(w * 0.22, 0)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#3d4248'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(w * 0.36, -h * 0.5, w * 0.06, 0, Math.PI * 2)
  ctx.stroke()
  if (w >= 36) {
    ctx.fillStyle = '#e9ecef'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.font = `800 ${Math.round(w * 0.12)}px ${o.font}`
    ctx.fillText(p.big ? '×100' : '×10', ix + iw / 2, -h + 1)
  }
  ctx.restore()
}

/** 반짝임: 네 갈래 별 */
export function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, t: number) {
  // t: 0→1 (나타났다 사라짐)
  const a = Math.sin(t * Math.PI)
  const s = size * (0.4 + 0.6 * a)
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(t * 0.6)
  ctx.globalAlpha = a
  ctx.fillStyle = '#fffbe6'
  ctx.shadowColor = '#fff3b0'
  ctx.shadowBlur = s * 0.8
  ctx.beginPath()
  ctx.moveTo(0, -s)
  ctx.quadraticCurveTo(s * 0.12, -s * 0.12, s, 0)
  ctx.quadraticCurveTo(s * 0.12, s * 0.12, 0, s)
  ctx.quadraticCurveTo(-s * 0.12, s * 0.12, -s, 0)
  ctx.quadraticCurveTo(-s * 0.12, -s * 0.12, 0, -s)
  ctx.fill()
  ctx.restore()
}
