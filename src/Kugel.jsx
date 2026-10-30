import { useEffect, useRef } from 'react'

// Leuchtende Punktwolke. energie() liefert 0..1 – beim Sprechen bewegt sie sich stärker.
export default function Kugel({ punkte = 1500, energie, className }) {
  const ref = useRef(null)
  const energieRef = useRef(energie)
  energieRef.current = energie

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const pkt = []
    const golden = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < punkte; i++) {
      const y = 1 - (i / (punkte - 1)) * 2
      const r = Math.sqrt(1 - y * y)
      const th = golden * i
      pkt.push([Math.cos(th) * r, y, Math.sin(th) * r])
    }
    let w = 0, h = 0, dpr = 1, rahmen, glatt = 0.25
    const groesse = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = canvas.clientWidth; h = canvas.clientHeight
      canvas.width = w * dpr; canvas.height = h * dpr
    }
    groesse()
    window.addEventListener('resize', groesse)
    const start = performance.now()
    const bild = (now) => {
      if (canvas.clientWidth !== w || canvas.clientHeight !== h) groesse()
      const t = (now - start) / 1000
      const ziel = energieRef.current ? energieRef.current() : 0.25
      glatt += (ziel - glatt) * 0.15
      const e = glatt
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      const R = Math.min(w, h) * 0.34, cx = w / 2, cy = h / 2
      const ay = t * 0.35, ax = 0.5 + Math.sin(t * 0.2) * 0.25
      const cyA = Math.cos(ay), syA = Math.sin(ay), cxA = Math.cos(ax), sxA = Math.sin(ax)
      for (const [x0, y0, z0] of pkt) {
        const verform = 1 + (0.18 + e * 0.22) * Math.sin(3 * x0 + t * 1.3) * Math.cos(2.5 * y0 - t)
          + (0.08 + e * 0.12) * Math.sin(5 * z0 + t * 2.1)
        const x = x0 * verform, y = y0 * verform * 0.92, z = z0 * verform
        const x1 = x * cyA + z * syA, z1 = -x * syA + z * cyA
        const y1 = y * cxA - z1 * sxA, z2 = y * sxA + z1 * cxA
        const tiefe = (z2 + 1.4) / 2.8
        const mix = (y0 + 1) / 2
        const rC = Math.round(150 + 100 * mix), gC = Math.round(200 - 40 * mix), bC = 255 - Math.round(20 * mix)
        ctx.fillStyle = `rgba(${rC},${gC},${bC},${0.15 + tiefe * 0.75})`
        const s = 0.5 + tiefe * 1.3
        ctx.fillRect(cx + x1 * R - s / 2, cy + y1 * R - s / 2, s, s)
      }
      rahmen = requestAnimationFrame(bild)
    }
    rahmen = requestAnimationFrame(bild)
    return () => { cancelAnimationFrame(rahmen); window.removeEventListener('resize', groesse) }
  }, [punkte])

  return <canvas ref={ref} className={className} />
}
