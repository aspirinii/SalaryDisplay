/**
 * 동전·지폐 그리기 (Canvas).
 * 실제 화폐 도안은 쓰지 않음 — 색과 숫자만 살린 단순한 그림 (한국은행 화폐 도안 이용 기준 고려).
 */
import type { Denom } from './money'
import type { Piece, SlotDecor } from './layout'

const BILL_COLOR: Record<number, { base: string; dark: string; light: string }> = {
  1000: { base: '#86a9d6', dark: '#4d6f9c', light: '#c4d6ee' },
  5000: { base: '#e3a46c', dark: '#a8653a', light: '#f3d2b3' },
  10000: { base: '#93bd85', dark: '#557d48', light: '#cde3c4' },
}
const COIN_COLOR: Record<number, { face: [string, string]; edge: string; ink: string }> = {
  100: { face: ['#eef0f2', '#a8adb3'], edge: '#868b91', ink: '#5d6268' },
  500: { face: ['#f6f5f1', '#b9b6ad'], edge: '#8f8b82', ink: '#625e55' },
}

const short = (d: Denom) => (d >= 10000 ? '10000' : String(d))

function coin(ctx: CanvasRenderingContext2D, p: Extract<Piece, { shape: 'coin' }>, font: string) {
  const c = COIN_COLOR[p.denom]
  const ry = p.r * p.k
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.rot)
  // 옆면
  ctx.fillStyle = c.edge
  ctx.beginPath()
  ctx.ellipse(0, p.t, p.r, ry, 0, 0, Math.PI)
  ctx.lineTo(-p.r, 0)
  ctx.ellipse(0, 0, p.r, ry, 0, Math.PI, 0, true)
  ctx.closePath()
  ctx.fill()
  // 윗면
  const g = ctx.createLinearGradient(-p.r, -ry, p.r, ry)
  g.addColorStop(0, c.face[0])
  g.addColorStop(1, c.face[1])
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(0, 0, p.r, ry, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = c.edge
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.ellipse(0, 0, p.r * 0.84, ry * 0.84, 0, 0, Math.PI * 2)
  ctx.stroke()
  if (p.face && p.r >= 9) {
    ctx.scale(1, p.k)
    ctx.fillStyle = c.ink
    ctx.font = `700 ${Math.round(p.r * 0.72)}px ${font}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(short(p.denom), 0, p.r * 0.05)
  }
  ctx.restore()
}

function billFace(ctx: CanvasRenderingContext2D, d: Denom, w: number, h: number, font: string, text: boolean) {
  const c = BILL_COLOR[d]
  ctx.fillStyle = c.base
  ctx.fillRect(-w / 2, -h / 2, w, h)
  ctx.strokeStyle = c.dark
  ctx.lineWidth = Math.max(1, h * 0.04)
  ctx.strokeRect(-w / 2 + h * 0.08, -h / 2 + h * 0.08, w - h * 0.16, h - h * 0.16)
  // 왼쪽 동그라미(무늬 자리)
  ctx.fillStyle = c.light
  ctx.beginPath()
  ctx.ellipse(-w * 0.26, 0, h * 0.28, h * 0.28, 0, 0, Math.PI * 2)
  ctx.fill()
  if (text && h >= 14) {
    ctx.fillStyle = c.dark
    ctx.font = `800 ${Math.round(h * 0.34)}px ${font}`
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText(d.toLocaleString('ko-KR'), w * 0.42, -h * 0.02)
  }
}

function bill(ctx: CanvasRenderingContext2D, p: Extract<Piece, { shape: 'bill' }>, font: string) {
  const c = BILL_COLOR[p.denom]
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.scale(1, p.k)
  ctx.rotate(p.rot)
  // 두께(아랫면)
  ctx.fillStyle = c.dark
  ctx.fillRect(-p.w / 2, -p.h / 2 + 2 / p.k, p.w, p.h)
  billFace(ctx, p.denom, p.w, p.h, font, p.face)
  ctx.restore()
}

function bundle(ctx: CanvasRenderingContext2D, p: Extract<Piece, { shape: 'bundle' }>, font: string) {
  const c = BILL_COLOR[p.denom]
  const hh = (p.h * p.k) / 2
  ctx.save()
  ctx.translate(p.x, p.y)
  // 옆면 (종이 결)
  ctx.fillStyle = c.dark
  ctx.fillRect(-p.w / 2, -p.thick - hh, p.w, p.thick + hh)
  ctx.strokeStyle = c.light
  ctx.globalAlpha = 0.5
  ctx.lineWidth = 1
  for (let y = -p.thick; y < 0; y += 3) {
    ctx.beginPath()
    ctx.moveTo(-p.w / 2, y)
    ctx.lineTo(p.w / 2, y)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  // 윗면
  ctx.save()
  ctx.translate(0, -p.thick - hh)
  ctx.scale(1, p.k)
  billFace(ctx, p.denom, p.w, p.h, font, false)
  ctx.restore()
  // 띠지
  const bw = p.w * 0.16
  ctx.fillStyle = '#f4f1e8'
  ctx.fillRect(-bw / 2, -p.thick - hh * 2, bw, p.thick + hh * 2)
  ctx.strokeStyle = '#c9c3b2'
  ctx.strokeRect(-bw / 2, -p.thick - hh * 2, bw, p.thick + hh * 2)
  if (p.thick >= 10) {
    ctx.fillStyle = '#6d6656'
    ctx.font = `700 ${Math.max(8, Math.round(Math.min(p.thick * 0.55, bw * 0.4)))}px ${font}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.save()
    ctx.translate(0, -p.thick / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText(p.label, 0, 0)
    ctx.restore()
  }
  ctx.restore()
}

function roll(ctx: CanvasRenderingContext2D, p: Extract<Piece, { shape: 'roll' }>, font: string) {
  const ry = p.r * p.k
  const paper = p.denom === 500 ? '#c8d5e6' : '#dccaa0'
  const ink = p.denom === 500 ? '#4c5f7a' : '#6f5a2c'
  ctx.save()
  ctx.translate(p.x, p.y - ry)
  ctx.fillStyle = paper
  ctx.beginPath()
  ctx.ellipse(0, 0, p.r, ry, 0, 0, Math.PI)
  ctx.lineTo(-p.r, -p.len)
  ctx.ellipse(0, -p.len, p.r, ry, 0, Math.PI, 0, true)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = ink
  ctx.globalAlpha = 0.35
  ctx.stroke()
  ctx.globalAlpha = 1
  // 윗면 (동전 끝이 보임)
  ctx.fillStyle = COIN_COLOR[p.denom].face[1]
  ctx.beginPath()
  ctx.ellipse(0, -p.len, p.r * 0.92, ry * 0.92, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = ink
  ctx.font = `700 ${Math.round(p.r * 0.55)}px ${font}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.save()
  ctx.translate(0, -p.len / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText(`${p.denom}×50`, 0, 0)
  ctx.restore()
  ctx.restore()
}

function bag(ctx: CanvasRenderingContext2D, p: Extract<Piece, { shape: 'bag' }>, font: string) {
  const r = p.r
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.fillStyle = '#b8996a'
  ctx.beginPath()
  ctx.moveTo(-r * 0.9, 0)
  ctx.quadraticCurveTo(-r * 1.15, -r * 1.1, -r * 0.35, -r * 1.55)
  ctx.lineTo(r * 0.35, -r * 1.55)
  ctx.quadraticCurveTo(r * 1.15, -r * 1.1, r * 0.9, 0)
  ctx.closePath()
  ctx.fill()
  // 묶은 끈
  ctx.fillStyle = '#8a6d43'
  ctx.fillRect(-r * 0.4, -r * 1.62, r * 0.8, r * 0.16)
  ctx.beginPath()
  ctx.moveTo(-r * 0.3, -r * 1.62)
  ctx.lineTo(-r * 0.55, -r * 1.95)
  ctx.lineTo(r * 0.55, -r * 1.95)
  ctx.lineTo(r * 0.3, -r * 1.62)
  ctx.fillStyle = '#b8996a'
  ctx.fill()
  ctx.fillStyle = '#5d4826'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `800 ${Math.round(r * 0.6)}px ${font}`
  ctx.fillText('₩', 0, -r * 0.85)
  ctx.font = `700 ${Math.round(r * 0.34)}px ${font}`
  ctx.fillText(`${p.denom}×1000`, 0, -r * 0.35)
  ctx.restore()
}

export function drawPiece(ctx: CanvasRenderingContext2D, p: Piece, font: string) {
  switch (p.shape) {
    case 'coin':
      return coin(ctx, p, font)
    case 'bill':
      return bill(ctx, p, font)
    case 'bundle':
      return bundle(ctx, p, font)
    case 'roll':
      return roll(ctx, p, font)
    case 'bag':
      return bag(ctx, p, font)
  }
}

export interface Theme {
  accent: string
  muted: string
  border: string
  text: string
  font: string
}

/** 시간별 칸 배경·이름 */
export function drawSlots(ctx: CanvasRenderingContext2D, slots: SlotDecor[], floor: number, th: Theme, big: boolean) {
  for (const s of slots) {
    const x = s.x + 2
    const w = s.w - 4
    ctx.save()
    if (s.state === 'now') {
      ctx.fillStyle = th.accent
      ctx.globalAlpha = 0.1
      ctx.fillRect(x, 4, w, floor - 4)
      ctx.globalAlpha = 1
      ctx.strokeStyle = th.accent
      ctx.lineWidth = 1.5
      ctx.strokeRect(x + 0.5, 4.5, w - 1, floor - 5)
    } else {
      ctx.strokeStyle = th.border
      ctx.lineWidth = 1
      if (s.state === 'future') ctx.setLineDash([4, 4])
      ctx.strokeRect(x + 0.5, 4.5, w - 1, floor - 5)
    }
    ctx.restore()
    ctx.fillStyle = s.state === 'now' ? th.accent : th.muted
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.font = `${s.state === 'now' ? 700 : 500} ${big ? 13 : 11}px ${th.font}`
    ctx.fillText(s.label, s.x + s.w / 2, floor + 6)
    if (big && s.w >= 56 && s.amount > 0) {
      ctx.font = `400 11px ${th.font}`
      ctx.fillStyle = th.muted
      ctx.fillText(`₩${Math.floor(s.amount).toLocaleString('ko-KR')}`, s.x + s.w / 2, floor + 22)
    }
    if (s.rest) {
      ctx.fillStyle = th.muted
      ctx.font = `500 ${big ? 13 : 11}px ${th.font}`
      ctx.textBaseline = 'middle'
      ctx.fillText('휴게', s.x + s.w / 2, floor / 2)
    }
  }
}
