/**
 * 돈 쌓기 배치: 묶음 목록 → 그릴 조각(위치·모양) 목록.
 * 위치는 조각 이름(key)으로 정해지는 시드 난수 → 새로고침해도 같은 모습.
 */
import { wonLook, type GoldPiece, type Look, type LookFn } from './gold'
import type { Denom, Group, HourSlot } from './money'

export type Piece =
  | { shape: 'coin'; key: string; denom: Denom; x: number; y: number; r: number; k: number; t: number; rot: number; face: boolean; gold?: GoldPiece }
  | { shape: 'bill'; key: string; denom: Denom; x: number; y: number; w: number; h: number; k: number; rot: number; face: boolean }
  | { shape: 'roll'; key: string; denom: Denom; x: number; y: number; r: number; k: number; len: number }
  | { shape: 'bundle'; key: string; denom: Denom; x: number; y: number; w: number; h: number; k: number; thick: number; label: string }
  | { shape: 'bag'; key: string; denom: Denom; x: number; y: number; r: number; gold?: boolean }
  | { shape: 'dust'; key: string; denom: Denom; x: number; y: number; r: number; seed: number }
  | { shape: 'bar'; key: string; denom: Denom; x: number; y: number; w: number; d: number; h: number; rot: number; face: boolean; gold: GoldPiece }
  | { shape: 'chest'; key: string; denom: Denom; x: number; y: number; w: number }
  | { shape: 'safe'; key: string; denom: Denom; x: number; y: number; w: number; big: boolean }

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

/** 조각 크기 (계열·배율별) */
function sizes(m: Metrics, d: Denom, L: Look) {
  const r = L.family === 'coin' ? coinR(m, d) : L.family === 'dust' ? m.r * 0.42 * L.scale : m.r * L.scale
  const t = L.family === 'gcoin' ? m.t * L.scale * 1.3 : m.t
  const bw = m.r * 2.4 * L.scale
  return { r, t, bw, bd: bw * 0.45, bh: bw * 0.2 }
}

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

/* ───────────── 조각 모양 (계열별) ───────────── */

interface Spec {
  /** 차곡차곡: 칸 너비·깊이, 칸 하나에 들어가는 개수 */
  cellW: number
  cellDepth: number
  perCell: number
  /** 칸 안 i번째 조각 (칸 왼쪽 x, 바닥 y) */
  inCell: (key: string, x: number, y: number, i: number, last: boolean) => Piece
  /** 더미: 바닥 너비, 쌓이는 높이 */
  fw: number
  inc: number
  /** 더미에 놓을 때 (가운데 x, 바닥 y) */
  inHeap: (key: string, cx: number, bottom: number, rand: () => number) => Piece
}

const TOWER = 10
const BILL_STACK = 20
const DUST_MOUND = 15
const BAR_PYRAMID = 6

/** 묶음 하나가 차지하는 자리 (낱개 몇 개 분량): 차곡차곡은 칸 하나, 더미는 조금 */
export function packCost(f: Look['family'], neat: boolean): number {
  if (!neat) return 3
  return { coin: TOWER, gcoin: TOWER, bill: BILL_STACK, dust: DUST_MOUND, bar: BAR_PYRAMID }[f]
}

function spec(u: Unit, m: Metrics, L: Look): Spec {
  const d = u.denom
  const { r, t, bw, bd, bh } = sizes(m, d, L)
  const one = (p: Piece) => p
  if (u.kind !== 'loose') {
    const crate = u.kind === 'crate'
    switch (L.family) {
      case 'coin': {
        const make = (key: string, cx: number, y: number): Piece =>
          crate
            ? { shape: 'bag', key, denom: d, x: cx, y, r: r * 1.5 }
            : { shape: 'roll', key, denom: d, x: cx, y, r, k: m.k, len: m.t * TOWER * 1.5 }
        const w = crate ? r * 3.4 : r * 2 + 6
        return {
          cellW: w, cellDepth: crate ? r * 1.6 : r * 2 * m.k + 4, perCell: 1,
          inCell: (key, x, y) => make(key, x + w / 2, y),
          fw: crate ? r * 3 : r * 2, inc: crate ? r * 2.2 : r * 1.6,
          inHeap: (key, cx, b) => make(key, cx, b),
        }
      }
      case 'bill': {
        const make = (key: string, cx: number, y: number): Piece => ({
          shape: 'bundle', key, denom: d, x: cx, y, w: m.billW, h: m.billH, k: m.k,
          thick: m.billT * (crate ? 26 : 12), label: crate ? '1,000장' : '100장',
        })
        return {
          cellW: m.billW + 8, cellDepth: m.billH * m.k + 4, perCell: 1,
          inCell: (key, x, y) => make(key, x + m.billW / 2, y),
          fw: m.billW, inc: m.billT * (crate ? 26 : 12) + m.billH * m.k * 0.45,
          inHeap: (key, cx, b) => make(key, cx, b),
        }
      }
      case 'gcoin':
      case 'dust': {
        // 금화 주머니 / 보물상자 (크기는 금화 기준)
        const R = L.family === 'dust' ? m.r : r
        const w = crate ? R * 4.6 : R * 3
        const make = (key: string, cx: number, y: number): Piece =>
          crate ? { shape: 'chest', key, denom: d, x: cx, y, w } : { shape: 'bag', key, denom: d, x: cx, y, r: R * 1.35, gold: true }
        return {
          cellW: w + 6, cellDepth: crate ? R * 2.2 : R * 1.6, perCell: 1,
          inCell: (key, x, y) => make(key, x + (w + 6) / 2, y),
          fw: w, inc: crate ? R * 2.6 : R * 2.2,
          inHeap: (key, cx, b) => make(key, cx, b),
        }
      }
      case 'bar': {
        const w = crate ? bw * 2.6 : bw * 1.8
        const make = (key: string, cx: number, y: number): Piece => ({ shape: 'safe', key, denom: d, x: cx, y, w, big: crate })
        return {
          cellW: w + 8, cellDepth: w * 0.45, perCell: 1,
          inCell: (key, x, y) => make(key, x + (w + 8) / 2, y),
          fw: w, inc: w * 1.05,
          inHeap: (key, cx, b) => make(key, cx, b),
        }
      }
    }
  }
  switch (L.family) {
    case 'coin':
    case 'gcoin': {
      const gold = L.gold
      return {
        cellW: r * 2 + 6, cellDepth: r * 2 * m.k + 4, perCell: TOWER,
        inCell: (key, x, y, i, last) =>
          one({ shape: 'coin', key, denom: d, x: x + r + 3, y: y - r * m.k - t - i * t, r, k: m.k, t, rot: 0, face: last, gold }),
        fw: r * 2, inc: t * 1.7,
        inHeap: (key, cx, b, rand) => {
          const k = 0.32 + rand() * 0.3
          return { shape: 'coin', key, denom: d, x: cx, y: b - r * k - t, r, k, t, rot: (rand() - 0.5) * 0.5, face: true, gold }
        },
      }
    }
    case 'dust': {
      const cw = r * 2 * 5 + 6
      return {
        cellW: cw, cellDepth: r * 3, perCell: DUST_MOUND,
        // 5-4-3-2-1 작은 무더기
        inCell: (key, x, y, i) => {
          let row = 0
          let left = i
          while (left >= 5 - row) {
            left -= 5 - row
            row++
          }
          const j = rng(key)
          return {
            shape: 'dust', key, denom: d,
            x: x + 3 + r + (row * r) + left * r * 2 + (j() - 0.5) * r * 0.4, y: y - r * 0.6 - row * r * 1.1, r, seed: Math.floor(j() * 1e6),
          }
        },
        fw: r * 2, inc: r * 0.55,
        inHeap: (key, cx, b, rand) => ({ shape: 'dust', key, denom: d, x: cx, y: b - r * 0.6, r, seed: Math.floor(rand() * 1e6) }),
      }
    }
    case 'bar': {
      const gold = L.gold ?? 'bar'
      return {
        cellW: bw * 3 + 8, cellDepth: bd * 0.6 + 4, perCell: BAR_PYRAMID,
        // 금고식 피라미드: 아래 3 → 2 → 1
        inCell: (key, x, y, i, last) => {
          const layer = i < 3 ? 0 : i < 5 ? 1 : 2
          const pos = i < 3 ? i : i < 5 ? i - 3 : 0
          return {
            shape: 'bar', key, denom: d, x: x + 4 + bw / 2 + layer * bw * 0.5 + pos * bw, y: y - layer * bh,
            w: bw * 0.96, d: bd, h: bh, rot: 0, face: last || layer === 2, gold,
          }
        },
        fw: bw * 0.95, inc: bh * 0.85,
        inHeap: (key, cx, b, rand) => ({
          shape: 'bar', key, denom: d, x: cx, y: b, w: bw * 0.96, d: bd, h: bh, rot: (rand() - 0.5) * 0.25, face: true, gold,
        }),
      }
    }
    case 'bill':
      return {
        cellW: m.billW + 8, cellDepth: m.billH * m.k + 4, perCell: BILL_STACK,
        inCell: (key, x, y, i, last) => {
          const j = rng(key)
          return {
            shape: 'bill', key, denom: d,
            x: x + 4 + m.billW / 2 + (j() - 0.5) * 3, y: y - (m.billH * m.k) / 2 - m.billT - i * m.billT,
            w: m.billW, h: m.billH, k: m.k, rot: (j() - 0.5) * 0.05, face: last,
          }
        },
        fw: m.billW * 0.92, inc: Math.max(1.5, m.billT * 2.2),
        inHeap: (key, cx, b, rand) => ({
          shape: 'bill', key, denom: d, x: cx, y: b - (m.billH * m.k) / 2,
          w: m.billW, h: m.billH, k: m.k, rot: (rand() - 0.5) * 1.1, face: true,
        }),
      }
  }
}

/* ───────────── ② 차곡차곡 ───────────── */

/**
 * 동전은 10개씩 탑, 지폐는 20장씩, 골드바는 6개 피라미드, 사금은 작은 무더기.
 * 왼→오른쪽으로 칸을 채우고, 줄이 차면 다음 줄. 나중에 채운 줄이 앞(바닥).
 */
export function neatPieces(
  groups: Group[], box: Box, m: Metrics, floor: number, prefix = '', padX = 8, look: LookFn = wonLook,
): Piece[] {
  const pieces: Piece[] = []
  type Cell = { w: number; depth: number; draw: (x: number, y: number) => void }
  const cells: Cell[] = []
  for (const g of groups) {
    const L = look(g.denom)
    const all = units([g])
    for (const u of all.filter((x) => x.kind !== 'loose')) {
      const sp = spec(u, m, L)
      const key = unitKey(prefix, u)
      cells.push({ w: sp.cellW, depth: sp.cellDepth, draw: (x, y) => pieces.push(sp.inCell(key, x, y, 0, true)) })
    }
    const loose = all.filter((x) => x.kind === 'loose')
    if (!loose.length) continue
    const sp = spec(loose[0], m, L)
    for (let s = 0; s * sp.perCell < loose.length; s++) {
      const slice = loose.slice(s * sp.perCell, s * sp.perCell + sp.perCell)
      cells.push({
        w: sp.cellW,
        depth: sp.cellDepth,
        draw: (x, y) => slice.forEach((u, i) => pieces.push(sp.inCell(unitKey(prefix, u), x, y, i, i === slice.length - 1))),
      })
    }
  }

  // 줄 나누기
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

/** 차곡차곡 상한: 칸 수 × 칸당 개수 (대략, 가장 많은 단위 모양 기준). 5줄까지 (넘치면 묶음) */
export function neatCapacity(box: Box, m: Metrics, look: Look, denom: Denom = 100): number {
  const sp = spec({ kind: 'loose', denom, index: 0 }, m, look)
  const perRow = Math.max(1, Math.floor((box.w - 16) / sp.cellW))
  const towerH = look.family === 'bill' ? m.billT * BILL_STACK : look.family === 'bar' ? sp.inc * 3 : sp.inc * TOWER
  const rows = Math.max(1, Math.min(5, Math.floor((box.h - 12 - towerH) / (sp.cellDepth * 0.8))))
  return Math.max(sp.perCell, perRow * rows * sp.perCell)
}

/* ───────────── ① 마구잡이 더미 ───────────── */

/** 위에서 떨어뜨려 낮은 쪽으로 미끄러져 내려앉게. 결과는 조각 순서와 이름만으로 정해짐 */
export function heapPieces(groups: Group[], box: Box, m: Metrics, floor: number, look: LookFn = wonLook): Piece[] {
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
  const specs = new Map<Unit, Spec>(all.map((u) => [u, spec(u, m, look(u.denom))]))
  // 묶음(롤·다발·주머니·상자·금고)은 맨 앞 바닥에 나란히 (나중에 생긴 것일수록 오른쪽), 낱개 더미는 그 뒤에
  const packed = all.filter((u) => u.kind !== 'loose')
  const rowW = packed.reduce((sum, u) => sum + specs.get(u)!.fw + 2, 0)
  const placed = new Map<Unit, number>()
  if (rowW <= box.w - pad * 2) {
    let px = (box.w - rowW) / 2
    for (const u of packed) {
      placed.set(u, px)
      px += specs.get(u)!.fw + 2
    }
  }

  const front: Piece[] = []
  // 앞줄이 있으면 더미는 조금 뒤(화면 위)에
  const heapFloor = placed.size ? floor - m.r * 2 * m.k * 0.9 : floor
  for (const u of all) {
    const key = unitKey('', u)
    const rand = rng(key)
    const { fw, inc, inHeap } = specs.get(u)!
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
      heap.push(inHeap(key, x + fw / 2, heapFloor - base, rand))
    } else {
      front.push(inHeap(key, x + fw / 2, floor, rand))
    }
  }
  // 앞줄(묶음)을 나중에 그려 더미 앞에 보이게
  return [...heap, ...front]
}

/** 더미 상한: 쌓을 수 있는 부피 / 조각 하나 부피 */
export function heapCapacity(box: Box, m: Metrics, look: Look, denom: Denom = 100): number {
  const sp = spec({ kind: 'loose', denom, index: 0 }, m, look)
  const v = sp.fw * sp.inc * (look.family === 'bill' ? 0.9 : 1)
  return Math.max(12, Math.floor((box.w * (box.h - 16) * 0.35) / v))
}
