/**
 * 돈 쌓기 배치: 묶음 목록 → 그릴 조각(위치·모양) 목록.
 * 위치는 조각 이름(key)으로 정해지는 시드 난수 → 새로고침해도 같은 모습.
 */
import { isCoin, type Denom, type Group, type HourSlot } from './money'

export type Piece =
  | { shape: 'coin'; key: string; denom: Denom; x: number; y: number; r: number; k: number; t: number; rot: number; face: boolean }
  | { shape: 'bill'; key: string; denom: Denom; x: number; y: number; w: number; h: number; k: number; rot: number; face: boolean }
  | { shape: 'roll'; key: string; denom: Denom; x: number; y: number; r: number; k: number; len: number }
  | { shape: 'bundle'; key: string; denom: Denom; x: number; y: number; w: number; h: number; k: number; thick: number; label: string }
  | { shape: 'bag'; key: string; denom: Denom; x: number; y: number; r: number }

export interface SlotDecor {
  x: number
  w: number
  label: string
  amount: number
  state: HourSlot['state']
  rest: boolean
}

export interface PileScene {
  pieces: Piece[]
  slots: SlotDecor[]
  /** 바닥선 y */
  floor: number
}

export interface Box {
  w: number
  h: number
}

/* ───────────── 크기 ───────────── */

export interface Metrics {
  r: number
  k: number
  t: number
  billW: number
  billH: number
  billT: number
}

export function metrics(width: number, scale = 1): Metrics {
  const r = Math.min(17, Math.max(9, width / 38)) * scale
  return { r, k: 0.42, t: r * 0.26, billW: r * 4.6, billH: r * 4.6 * 0.47, billT: Math.max(1, r * 0.09) }
}

/** 실제 지름 비율: 10원 18mm · 50원 21.6mm · 100원 24mm · 500원 26.5mm */
const COIN_SIZE: Partial<Record<Denom, number>> = { 10: 0.75, 50: 0.9, 100: 1, 500: 1.1 }
const coinR = (m: Metrics, d: Denom) => m.r * (COIN_SIZE[d] ?? 1)

/* ───────────── 시드 난수 ───────────── */

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function rng(key: string): () => number {
  let a = hash(key)
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ───────────── 조각 목록 (묶음 → 낱개 순서) ───────────── */

interface Unit {
  kind: 'crate' | 'pack' | 'loose'
  denom: Denom
  index: number
}

function units(groups: Group[]): Unit[] {
  const out: Unit[] = []
  for (const g of groups) {
    for (let i = 0; i < g.crates; i++) out.push({ kind: 'crate', denom: g.denom, index: i })
    for (let i = 0; i < g.packs; i++) out.push({ kind: 'pack', denom: g.denom, index: i })
    for (let i = 0; i < g.loose; i++) out.push({ kind: 'loose', denom: g.denom, index: i })
  }
  return out
}

const unitKey = (prefix: string, u: Unit) => `${prefix}${u.denom}:${u.kind[0]}${u.index}`

/* ───────────── ② 차곡차곡 ───────────── */

const TOWER = 10
const BILL_STACK = 20

/**
 * 동전은 10개씩 탑, 지폐는 20장씩 포개고, 앞줄부터 왼→오른쪽으로 채움.
 * 줄이 차면 뒷줄(화면 위쪽)로.
 */
export function neatPieces(groups: Group[], box: Box, m: Metrics, floor: number, prefix = '', padX = 8): Piece[] {
  const pieces: Piece[] = []
  // 같은 단위 낱개는 탑/더미로 묶어 칸 하나씩
  type Cell = { w: number; depth: number; draw: (x: number, y: number) => void }
  const cells: Cell[] = []
  for (const g of groups) {
    const coin = isCoin(g.denom)
    const r = coinR(m, g.denom)
    const all = units([g])
    const crates = all.filter((u) => u.kind === 'crate')
    const packs = all.filter((u) => u.kind === 'pack')
    const loose = all.filter((u) => u.kind === 'loose')
    for (const u of crates) {
      if (coin) {
        cells.push({
          w: r * 3.4,
          depth: r * 1.6,
          draw: (x, y) => pieces.push({ shape: 'bag', key: unitKey(prefix, u), denom: g.denom, x: x + r * 1.7, y, r: r * 1.5 }),
        })
      } else {
        cells.push({
          w: m.billW + 8,
          depth: m.billH * m.k + 4,
          draw: (x, y) =>
            pieces.push({
              shape: 'bundle', key: unitKey(prefix, u), denom: g.denom,
              x: x + m.billW / 2, y, w: m.billW, h: m.billH, k: m.k, thick: m.billT * 26, label: '1,000장',
            }),
        })
      }
    }
    for (const u of packs) {
      if (coin) {
        cells.push({
          w: r * 2 + 6,
          depth: r * 2 * m.k + 4,
          draw: (x, y) =>
            pieces.push({ shape: 'roll', key: unitKey(prefix, u), denom: g.denom, x: x + r, y, r, k: m.k, len: m.t * TOWER * 1.5 }),
        })
      } else {
        cells.push({
          w: m.billW + 8,
          depth: m.billH * m.k + 4,
          draw: (x, y) =>
            pieces.push({
              shape: 'bundle', key: unitKey(prefix, u), denom: g.denom,
              x: x + m.billW / 2, y, w: m.billW, h: m.billH, k: m.k, thick: m.billT * 12, label: '100장',
            }),
        })
      }
    }
    const per = coin ? TOWER : BILL_STACK
    for (let s = 0; s * per < loose.length; s++) {
      const slice = loose.slice(s * per, s * per + per)
      if (coin) {
        cells.push({
          w: r * 2 + 6,
          depth: r * 2 * m.k + 4,
          draw: (x, y) =>
            slice.forEach((u, i) =>
              pieces.push({
                shape: 'coin', key: unitKey(prefix, u), denom: g.denom,
                x: x + r, y: y - r * m.k - m.t - i * m.t, r, k: m.k, t: m.t, rot: 0, face: i === slice.length - 1,
              }),
            ),
        })
      } else {
        cells.push({
          w: m.billW + 8,
          depth: m.billH * m.k + 4,
          draw: (x, y) =>
            slice.forEach((u, i) => {
              const j = rng(unitKey(prefix, u))
              pieces.push({
                shape: 'bill', key: unitKey(prefix, u), denom: g.denom,
                x: x + m.billW / 2 + (j() - 0.5) * 3, y: y - (m.billH * m.k) / 2 - m.billT - i * m.billT,
                w: m.billW, h: m.billH, k: m.k, rot: (j() - 0.5) * 0.05, face: i === slice.length - 1,
              })
            }),
        })
      }
    }
  }

  // 줄 나누기 (앞줄부터)
  const rows: { cells: Cell[]; depth: number }[] = []
  let row: Cell[] = []
  let used = padX
  for (const c of cells) {
    if (row.length && used + c.w > box.w - padX) {
      rows.push({ cells: row, depth: Math.max(...row.map((x) => x.depth)) })
      row = []
      used = padX
    }
    row.push(c)
    used += c.w
  }
  if (row.length) rows.push({ cells: row, depth: Math.max(...row.map((x) => x.depth)) })

  // 나중에 채운 줄이 앞(바닥)에, 먼저 채운 줄은 뒤로 밀림 → 새로 생긴 것이 앞에 보임.
  // 뒷줄부터 그려야 앞줄이 위에 겹침
  const ys: number[] = new Array(rows.length)
  let y = floor
  for (let ri = rows.length - 1; ri >= 0; ri--) {
    ys[ri] = y
    y -= rows[ri].depth * 0.8
  }
  for (let ri = 0; ri < rows.length; ri++) {
    let x = padX + (ri % 2) * 3
    for (const c of rows[ri].cells) {
      c.draw(x, ys[ri])
      x += c.w
    }
  }
  return pieces
}

/** 차곡차곡 상한: 칸 수 × 칸당 개수 (대략) */
export function neatCapacity(box: Box, m: Metrics, coins: boolean): number {
  if (coins) {
    const perRow = Math.floor((box.w - 16) / (m.r * 2.24 + 6))
    // 줄이 너무 많으면 벽처럼 보여서 5줄까지 (넘치면 롤로)
    const rows = Math.min(5, Math.floor((box.h - 12 - m.t * TOWER) / ((m.r * 2 * m.k + 4) * 0.8)))
    return Math.max(10, perRow * Math.max(1, rows) * TOWER)
  }
  const perRow = Math.floor((box.w - 16) / (m.billW + 8))
  const rows = Math.floor((box.h - 12 - m.billT * BILL_STACK) / ((m.billH * m.k + 4) * 0.8))
  return Math.max(BILL_STACK, Math.max(1, perRow) * Math.max(1, rows) * BILL_STACK)
}

/* ───────────── ① 마구잡이 더미 ───────────── */

/** 위에서 떨어뜨려 낮은 쪽으로 미끄러져 내려앉게. 결과는 조각 순서와 이름만으로 정해짐 */
export function heapPieces(groups: Group[], box: Box, m: Metrics, floor: number): Piece[] {
  // 높이 지도 해상도 (px) — 조각이 작으면 더 촘촘히
  const COL = Math.max(0.5, Math.min(2, m.r * 0.2))
  const cols = Math.max(1, Math.ceil(box.w / COL))
  const hm = new Float32Array(cols)
  const heap: Piece[] = []
  const pad = 6
  const span = (x: number, fw: number) => [Math.max(0, Math.floor(x / COL)), Math.min(cols - 1, Math.ceil((x + fw) / COL))]
  // 가운데 절반이 닿는 높이 (가장자리는 기울어 걸침)
  const baseAt = (x: number, fw: number) => {
    const [a, b] = span(x + fw * 0.3, fw * 0.4)
    let h = 0
    for (let i = a; i <= b; i++) h = Math.max(h, hm[i])
    return h
  }

  const all = units(groups)
  // 롤·다발·자루는 맨 앞 바닥에 나란히 (나중에 생긴 것일수록 오른쪽), 낱개 더미는 그 뒤에 쌓임
  const footprint = (u: Unit) => {
    const r = coinR(m, u.denom)
    if (isCoin(u.denom)) return u.kind === 'crate' ? r * 3 : r * 2
    return m.billW
  }
  const packed = all.filter((u) => u.kind !== 'loose')
  const rowW = packed.reduce((sum, u) => sum + footprint(u) + 2, 0)
  const placed = new Map<Unit, number>()
  if (rowW <= box.w - pad * 2) {
    let px = (box.w - rowW) / 2
    for (const u of packed) {
      placed.set(u, px)
      px += footprint(u) + 2
    }
  }

  const front: Piece[] = []
  // 앞줄이 있으면 더미는 조금 뒤(화면 위)에
  const heapFloor = placed.size ? floor - m.r * 2 * m.k * 0.9 : floor
  for (const u of all) {
    const key = unitKey('', u)
    const rand = rng(key)
    const coin = isCoin(u.denom)
    const r = coinR(m, u.denom)
    let fw: number
    let inc: number
    if (u.kind === 'crate') {
      fw = coin ? r * 3 : m.billW
      inc = coin ? r * 2.2 : m.billT * 26 + m.billH * m.k * 0.5
    } else if (u.kind === 'pack') {
      fw = coin ? r * 2 : m.billW
      inc = coin ? r * 1.6 : m.billT * 12 + m.billH * m.k * 0.4
    } else {
      fw = coin ? r * 2 : m.billW * 0.92
      inc = coin ? m.t * 1.7 : Math.max(1.5, m.billT * 2.2)
    }
    // 가운데로 몰리게 (종 모양)
    const g = (rand() + rand() + rand()) / 3
    const room = Math.max(0, box.w - pad * 2 - fw)
    const fixed = placed.get(u)
    let x = fixed ?? pad + g * room
    let base = fixed === undefined ? baseAt(x, fw) : 0
    // 옆이 충분히 낮으면 그쪽으로 굴러 내려감 (안식각)
    const step = Math.max(COL, fw * 0.45)
    for (let i = 0; fixed === undefined && i < 60; i++) {
      const lx = Math.max(pad, x - step)
      const rx = Math.min(pad + room, x + step)
      const lb = lx < x ? baseAt(lx, fw) : Infinity
      const rb = rx > x ? baseAt(rx, fw) : Infinity
      const low = Math.min(lb, rb)
      if (!(low < base - inc * 0.6)) break
      x = lb === rb ? (rand() < 0.5 ? lx : rx) : lb < rb ? lx : rx
      base = low
    }
    if (fixed === undefined) {
      const [a, b] = span(x, fw)
      const mid = (a + b) / 2
      const half = Math.max(1, (b - a) / 2)
      for (let i = a; i <= b; i++) {
        const d = (i - mid) / half
        hm[i] = Math.max(hm[i], base + inc * (1 - 0.45 * d * d))
      }
    }
    const cx = x + fw / 2
    const bottom = fixed === undefined ? heapFloor - base : floor
    const pieces = fixed === undefined ? heap : front
    if (u.kind === 'crate' && coin) {
      pieces.push({ shape: 'bag', key, denom: u.denom, x: cx, y: bottom, r: r * 1.5 })
    } else if (u.kind !== 'loose' && !coin) {
      pieces.push({
        shape: 'bundle', key, denom: u.denom, x: cx, y: bottom, w: m.billW, h: m.billH, k: m.k,
        thick: m.billT * (u.kind === 'crate' ? 26 : 12), label: u.kind === 'crate' ? '1,000장' : '100장',
      })
    } else if (u.kind === 'pack') {
      pieces.push({ shape: 'roll', key, denom: u.denom, x: cx, y: bottom, r, k: m.k, len: m.t * TOWER * 1.5 })
    } else if (coin) {
      const k = 0.32 + rand() * 0.3
      pieces.push({
        shape: 'coin', key, denom: u.denom, x: cx, y: bottom - r * k - m.t,
        r, k, t: m.t, rot: (rand() - 0.5) * 0.5, face: true,
      })
    } else {
      pieces.push({
        shape: 'bill', key, denom: u.denom, x: cx, y: bottom - (m.billH * m.k) / 2,
        w: m.billW, h: m.billH, k: m.k, rot: (rand() - 0.5) * 1.1, face: true,
      })
    }
  }
  // 앞줄(묶음)을 나중에 그려 더미 앞에 보이게
  return [...heap, ...front]
}

/** 더미 상한: 쌓을 수 있는 부피 / 조각 하나 부피 */
export function heapCapacity(box: Box, m: Metrics, coins: boolean): number {
  const v = coins ? m.r * 2 * m.t * 1.7 : m.billW * 0.92 * Math.max(1.5, m.billT * 2.2) * 0.9
  return Math.max(12, Math.floor((box.w * (box.h - 16) * 0.35) / v))
}
