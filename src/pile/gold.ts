/**
 * 황금 모드: 원화 단위를 금 조각으로 바꿔 보여줌 (계산은 원화 그대로, 그림만 금).
 * 실제 시세는 쓰지 않음.
 */
import { isCoin, type Denom } from './money'

export type GoldPiece = 'dust' | 'coin' | 'bigCoin' | 'miniBar' | 'bar' | 'ingot'
export const GOLD_PIECES: readonly GoldPiece[] = ['dust', 'coin', 'bigCoin', 'miniBar', 'bar', 'ingot']
export const GOLD_NAME: Record<GoldPiece, string> = {
  dust: '사금',
  coin: '금화',
  bigCoin: '큰 금화',
  miniBar: '미니 골드바',
  bar: '골드바',
  ingot: '금괴',
}

export type GoldMapId = 'tenUp' | 'coinBill' | 'allCoins' | 'custom'
export type GoldStyle = 'basic' | 'eagle' | 'maple' | 'ibex' | 'korean' | 'refinery'
export const GOLD_STYLES: readonly GoldStyle[] = ['basic', 'eagle', 'maple', 'ibex', 'korean', 'refinery']
export const GOLD_STYLE_NAME: Record<GoldStyle, string> = {
  basic: '기본 (₩·별)',
  eagle: '독수리',
  maple: '단풍잎',
  ibex: '산양',
  korean: '무궁화 (한국풍)',
  refinery: '제련소 각인',
}
export type GoldTone = 'gold' | 'rose' | 'white'
export const GOLD_TONE_NAME: Record<GoldTone, string> = { gold: '황금', rose: '로즈골드', white: '화이트골드' }

type Map = Record<Denom, [GoldPiece, number]>

/** 바꾸기 표: 단위 → [금 조각, 크기 배율] (같은 조각은 크기로 구분) */
export const GOLD_MAPS: Record<Exclude<GoldMapId, 'custom'>, { name: string; description: string; map: Map }> = {
  tenUp: {
    name: '10원부터 금',
    description: '10원 금화 · 50원 큰 금화 · 100원 골드바 · 500원 이상 금괴',
    map: {
      10: ['coin', 1],
      50: ['bigCoin', 1],
      100: ['bar', 1],
      500: ['ingot', 0.9],
      1000: ['ingot', 1],
      5000: ['ingot', 1.15],
      10000: ['ingot', 1.3],
    },
  },
  coinBill: {
    name: '동전은 금화, 지폐는 골드바',
    description: '동전 → 금화(크기 차이) · 지폐 → 미니 골드바 · 골드바 · 금괴',
    map: {
      10: ['coin', 0.8],
      50: ['coin', 1],
      100: ['bigCoin', 1],
      500: ['bigCoin', 1.12],
      1000: ['miniBar', 1],
      5000: ['bar', 1],
      10000: ['ingot', 1],
    },
  },
  allCoins: {
    name: '모두 금화',
    description: '단위가 클수록 큰 금화',
    map: {
      10: ['coin', 0.8],
      50: ['coin', 1],
      100: ['coin', 1.15],
      500: ['bigCoin', 1],
      1000: ['bigCoin', 1.12],
      5000: ['bigCoin', 1.25],
      10000: ['bigCoin', 1.35],
    },
  },
}

/** 그리는 계열: 원화 동전·지폐, 금화, 사금, 골드바 */
export type Family = 'coin' | 'bill' | 'gcoin' | 'dust' | 'bar'

export interface Look {
  family: Family
  /** 기본 크기 대비 배율 */
  scale: number
  gold?: GoldPiece
}
export type LookFn = (d: Denom) => Look

export const wonLook: LookFn = (d) => ({ family: isCoin(d) ? 'coin' : 'bill', scale: 1 })

const PIECE_LOOK: Record<GoldPiece, { family: Family; scale: number }> = {
  dust: { family: 'dust', scale: 1 },
  coin: { family: 'gcoin', scale: 0.95 },
  bigCoin: { family: 'gcoin', scale: 1.2 },
  miniBar: { family: 'bar', scale: 0.75 },
  bar: { family: 'bar', scale: 1 },
  ingot: { family: 'bar', scale: 1.3 },
}

/** 단위 → 금 조각 (직접 고른 표가 있으면 그것, 크기는 조각 기본 크기) */
export function goldPieceFor(d: Denom, mapId: GoldMapId, custom?: Partial<Record<Denom, GoldPiece>>): [GoldPiece, number] {
  if (mapId === 'custom') {
    const p = custom?.[d]
    if (p) return [p, 1]
    return GOLD_MAPS.tenUp.map[d]
  }
  return GOLD_MAPS[mapId].map[d]
}

export function goldLook(mapId: GoldMapId, custom?: Partial<Record<Denom, GoldPiece>>): LookFn {
  return (d) => {
    const [piece, size] = goldPieceFor(d, mapId, custom)
    const base = PIECE_LOOK[piece]
    return { family: base.family, scale: base.scale * size, gold: piece }
  }
}

/** 묶음 크기: 원화 동전 롤 50·자루 1,000 / 지폐 다발 100·1,000 / 금화·사금 주머니 100·보물상자 1,000 / 골드바 금고 10·큰 금고 100 */
export function packFor(f: Family): { pack: number; crate: number } {
  switch (f) {
    case 'coin':
      return { pack: 50, crate: 1000 }
    case 'bill':
      return { pack: 100, crate: 1000 }
    case 'gcoin':
    case 'dust':
      return { pack: 100, crate: 1000 }
    case 'bar':
      return { pack: 10, crate: 100 }
  }
}

/** 개수 단위 */
export const countWord = (f: Family) => (f === 'bill' ? '장' : '개')
