'use client'

import { useEffect, useRef } from 'react'

/**
 * Campo de partículas de la portada.
 *
 * Es un canvas 2D, no WebGL: la intro cinematográfica ya carga Three.js y no
 * tiene sentido pagar otro contexto gráfico por unas estrellas de fondo. Las
 * partículas se acercan lentamente a cámara y una de cada seis se dibuja como
 * una nota musical, de modo que el fondo cuenta la misma historia que la marca:
 * sonido en movimiento.
 *
 * Reglas de coste y accesibilidad:
 * - el número de partículas depende del área real, con techo de 110;
 * - el DPR se limita a 2 para no rellenar pantallas 4K a precio de GPU;
 * - con `prefers-reduced-motion` se pinta un fotograma fijo y no se anima;
 * - si la pestaña se oculta, se cancela el bucle y se reanuda al volver.
 */
const GLYPHS = ['♪', '♫', '♩', '♬', '·'] as const
const MAX_DRIFTERS = 110

type Drifter = {
  x: number
  y: number
  z: number
  radius: number
  alpha: number
  speed: number
  glyph: string
  /** Sólo las notas giran; los puntos no necesitan ángulo. */
  angle: number
}

function makeDrifter(seeded: boolean): Drifter {
  const random = Math.random()
  return {
    x: Math.random() * 2 - 1,
    y: Math.random() * 2 - 1,
    z: seeded ? 0.08 + Math.random() * 0.92 : 1,
    radius: 0.45 + Math.random() * 1.55,
    alpha: 0.14 + Math.random() * 0.5,
    speed: 0.012 + Math.random() * 0.05,
    glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? '·',
    angle: seeded ? random * Math.PI * 2 : 0,
  }
}

export function ParticleField({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d', { alpha: true })
    if (!context) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let width = 0
    let height = 0
    let dpr = 1
    let frame = 0
    let last = 0
    let drifters: Drifter[] = []

    function paint(time: number) {
      if (!context) return
      const delta = last === 0 ? 1 : Math.min(3, (time - last) / 16.67)
      last = time

      context.clearRect(0, 0, width, height)

      const centerX = width / 2
      const centerY = height / 2

      for (const drifter of drifters) {
        if (!reducedMotion && time > 0) {
          drifter.z -= drifter.speed * 0.012 * delta
          if (drifter.z <= 0.035) {
            Object.assign(drifter, makeDrifter(false))
            drifter.z = 1
          }
        }

        const progress = 1 - drifter.z
        const spread = 0.12 + progress * 0.92
        const x = centerX + drifter.x * spread * centerX
        const y = centerY + drifter.y * spread * centerY
        const size = drifter.radius * (0.45 + progress * 1.9)
        const alpha = Math.min(0.78, drifter.alpha * (0.28 + progress * 1.35))

        if (x < -24 || x > width + 24 || y < -24 || y > height + 24) continue

        const isNote = drifter.glyph !== '·' && progress > 0.18
        if (isNote) {
          if (!reducedMotion) drifter.angle += 0.0025 * delta
          context.save()
          context.translate(x, y)
          context.rotate(Math.sin(drifter.angle) * 0.22)
          context.font = `${Math.max(9, size * 8).toFixed(1)}px ui-monospace, monospace`
          context.fillStyle = `rgba(224, 122, 95, ${alpha.toFixed(3)})`
          context.fillText(drifter.glyph, 0, 0)
          context.restore()
        } else {
          context.beginPath()
          context.arc(x, y, Math.max(0.4, size), 0, Math.PI * 2)
          context.fillStyle = `rgba(0, 229, 255, ${alpha.toFixed(3)})`
          context.fill()
        }
      }
    }

    function loop(time: number) {
      paint(time)
      frame = window.requestAnimationFrame(loop)
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = canvas?.clientWidth ?? 0
      height = canvas?.clientHeight ?? 0
      if (!canvas || width === 0 || height === 0) return

      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      context?.setTransform(dpr, 0, 0, dpr, 0, 0)

      const count = Math.min(MAX_DRIFTERS, Math.round((width * height) / 18_000))
      drifters = Array.from({ length: count }, () => makeDrifter(true))
      last = 0
      paint(reducedMotion ? 0 : performance.now())
    }

    function start() {
      if (frame !== 0 || reducedMotion) return
      last = 0
      frame = window.requestAnimationFrame(loop)
    }

    function stop() {
      if (frame === 0) return
      window.cancelAnimationFrame(frame)
      frame = 0
    }

    function onVisibility() {
      if (document.visibilityState === 'hidden') stop()
      else start()
    }

    resize()
    if (!reducedMotion) start()

    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => resize()) : null
    observer?.observe(canvas)
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stop()
      observer?.disconnect()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden="true" className={`cinema-particles ${className}`.trim()} />
}
