// 앱 아이콘 PNG 생성 (외부 이미지 도구 없이 순수 Node).
// 디자인: 어두운 배경 + 올라가는 막대 3개 + 동전.
// 실행: node scripts/gen-icons.mjs  → public/icons/*.png
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')
const BG = [0x11, 0x13, 0x12]
const ACCENT = [0x3f, 0xd3, 0x9a]
const COIN = [0xf2, 0xc1, 0x4e]
const COIN_RIM = [0xc4, 0x8f, 0x22]

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
function png(size, pixel) {
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x + 0.5, y + 0.5)
      const o = y * (size * 4 + 1) + 1 + x * 4
      raw[o] = r
      raw[o + 1] = g
      raw[o + 2] = b
      raw[o + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** 둥근 사각형 안쪽 판정 (단위 좌표 0~1) */
function inRoundRect(u, v, x0, y0, x1, y1, r) {
  if (u < x0 || u > x1 || v < y0 || v > y1) return false
  const cx = Math.min(Math.max(u, x0 + r), x1 - r)
  const cy = Math.min(Math.max(v, y0 + r), y1 - r)
  return (u - cx) ** 2 + (v - cy) ** 2 <= r * r
}

/**
 * @param maskable true면 배경을 끝까지 채우고 그림을 안전 영역(가운데 80%) 안에 둠
 */
function icon(size, maskable) {
  const S = 4 // 안티앨리어싱 샘플 (S×S)
  const pad = maskable ? 0.1 : 0
  const scale = 1 - pad * 2
  const sample = (u, v) => {
    // 배경
    const inBg = maskable || inRoundRect(u, v, 0.02, 0.02, 0.98, 0.98, 0.22)
    if (!inBg) return null
    // 그림 좌표 (안전 영역으로 축소)
    const x = (u - pad) / scale
    const y = (v - pad) / scale
    const bars = [
      [0.2, 0.62],
      [0.4, 0.48],
      [0.6, 0.34],
    ]
    for (const [bx, top] of bars) {
      if (inRoundRect(x, y, bx, top, bx + 0.14, 0.8, 0.03)) return ACCENT
    }
    // 동전
    const dx = x - 0.73
    const dy = y - 0.22
    const d = Math.hypot(dx, dy)
    if (d <= 0.11) return d >= 0.068 && d <= 0.084 ? COIN_RIM : COIN
    return BG
  }
  return png(size, (px, py) => {
    let r = 0, g = 0, b = 0, a = 0
    for (let i = 0; i < S; i++) {
      for (let j = 0; j < S; j++) {
        const c = sample((px - 0.5 + (i + 0.5) / S) / size, (py - 0.5 + (j + 0.5) / S) / size)
        if (!c) continue
        r += c[0]
        g += c[1]
        b += c[2]
        a += 255
      }
    }
    const n = S * S
    const cov = a / 255
    return cov ? [r / cov, g / cov, b / cov, a / n].map(Math.round) : [0, 0, 0, 0]
  })
}

mkdirSync(OUT, { recursive: true })
const files = {
  'icon-192.png': icon(192, false),
  'icon-512.png': icon(512, false),
  'maskable-512.png': icon(512, true),
  'apple-touch-icon.png': icon(180, true),
  'favicon-32.png': icon(32, false),
}
for (const [name, buf] of Object.entries(files)) {
  writeFileSync(join(OUT, name), buf)
  console.log(`${name}  ${buf.length} bytes`)
}
