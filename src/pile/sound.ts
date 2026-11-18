/**
 * 짤랑(동전)·사락(지폐) 소리 — 파일 없이 Web Audio로 합성.
 * 1초에 한 번 이상 울리지 않음. 브라우저는 사용자가 한 번 누른 뒤에만 소리를 허용함.
 */
let ctx: AudioContext | null = null
let last = 0

function audio(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
  return ctx
}

export function playMoney(kind: 'coin' | 'bill') {
  const now = performance.now()
  if (now - last < 1000) return
  last = now
  const a = audio()
  if (!a) return
  if (a.state === 'running') emit(a, kind)
  // 아직 허용 전이면 허용되는 대로 (설정에서 켤 때 들려줌)
  else void a.resume().then(() => emit(a, kind), () => {})
}

function emit(a: AudioContext, kind: 'coin' | 'bill') {
  const t = a.currentTime
  const out = a.createGain()
  out.gain.value = 0.18
  out.connect(a.destination)
  if (kind === 'coin') {
    // 높은 금속음 두 겹이 빨리 사라짐
    for (const [f, d] of [
      [2637, 0.35],
      [3951, 0.22],
      [5274, 0.12],
    ] as const) {
      const o = a.createOscillator()
      const g = a.createGain()
      o.type = 'sine'
      o.frequency.value = f
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.6, t + 0.004)
      g.gain.exponentialRampToValueAtTime(0.0001, t + d)
      o.connect(g).connect(out)
      o.start(t)
      o.stop(t + d + 0.02)
    }
  } else {
    // 걸러낸 잡음 = 종이 스치는 소리
    const len = Math.floor(a.sampleRate * 0.25)
    const buf = a.createBuffer(1, len, a.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
    const src = a.createBufferSource()
    src.buffer = buf
    const f = a.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = 3200
    f.Q.value = 0.8
    src.connect(f).connect(out)
    src.start(t)
  }
}

/** 설정에서 소리를 켤 때 (사용자 클릭 안에서 불러 소리를 허용받음) */
export function unlockSound() {
  audio()
}
