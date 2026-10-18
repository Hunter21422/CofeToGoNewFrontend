/** Короткий двухтоновый сигнал о новом заказе — без аудиофайлов */
let ctx: AudioContext | null = null

export function chime() {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    const t = ctx.currentTime
    for (const [i, f] of [880, 1318.5].entries()) {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = f
      g.gain.setValueAtTime(0.0001, t + i * 0.16)
      g.gain.exponentialRampToValueAtTime(0.25, t + i * 0.16 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.16 + 0.5)
      o.connect(g).connect(ctx.destination)
      o.start(t + i * 0.16)
      o.stop(t + i * 0.16 + 0.55)
    }
  } catch {
    /* браузер не дал звук — ничего страшного */
  }
}
