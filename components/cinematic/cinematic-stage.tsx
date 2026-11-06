'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'

import { actAt, CINEMATIC_ACTS, type CinematicAct } from '@/lib/cinematic/scenes'
import {
  ARC_SHADER,
  CORE_SHADER,
  FIELD_SHADER,
  NEBULA_SHADER,
  PORTAL_SHADER,
  RING_SHADER,
  STREAK_SHADER,
} from '@/lib/cinematic/shaders'
import type { CinematicEnv, QualityTier } from '@/lib/cinematic/quality'

/**
 * three r152+ ya gestiona el espacio de color: `new THREE.Color('#rrggbb')`
 * interpreta el hex como sRGB y lo lleva al espacio lineal de trabajo. Volver
 * a aplicar convertSRGBToLinear() oscurece y satura de más, así que se guarda
 * la conversión correcta una sola vez por hex.
 */
const LINEAR_CACHE = new Map<string, THREE.Color>()

function linear(hex: string): THREE.Color {
  const cached = LINEAR_CACHE.get(hex)
  if (cached) return cached
  const color = new THREE.Color(hex)
  LINEAR_CACHE.set(hex, color)
  return color
}

/** Copia del color lineal de un acto, para no mutar la caché en los lerps. */
function colorOf(act: CinematicAct, key: keyof CinematicAct['palette']): THREE.Color {
  return linear(act.palette[key]).clone()
}

const PARTICLE_COUNT: Record<QualityTier, number> = {
  low: 2200,
  medium: 6500,
  high: 13000,
}

/**
 * Peso de foco amortiguado.
 *
 * Cada acto dice qué capa manda (`focus`); si el peso se cambiara de golpe la
 * composición daría un salto justo en el corte. Con 2 por segundo la capa
 * crece durante el fundido de la transición y el encuadre llega ya reequilibrado.
 */
function focusValue(current: number, wanted: number, step: number): number {
  return THREE.MathUtils.damp(current, wanted, 2, step)
}

interface StageProps {
  actIndex: number
  quality: QualityTier
  reducedMotion: boolean
  env: React.MutableRefObject<CinematicEnv>
  onQualityDecline: () => void
}

/** Props que consumen los nodos de escena (el gobernador vive en la raíz). */
type SceneNodeProps = Pick<StageProps, 'actIndex' | 'quality' | 'reducedMotion' | 'env'>

/* ------------------------------------------------------------------ */
/* Cámara cinemática: muelle crítico + trayectoria continua            */
/*                                                                      */
/* El muelle críticamente amortiguado hace que la cámara llegue         */
/* deslizando en vez de frenada en seco, y la trayectoria dentro del acto */
/* convierte la pose siguiente en un punto de partida, no en un corte.  */
/* El objetivo mira con retardo (latigazo de cinematógrafo) y el alabeo */
/* sale de la propia velocidad lateral, como en un travelling real.     */
/* ------------------------------------------------------------------ */
function CameraRig({ actIndex, reducedMotion, env }: Pick<StageProps, 'actIndex' | 'reducedMotion' | 'env'>) {
  const { camera, pointer } = useThree()

  const rig = useMemo(() => ({
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    desired: new THREE.Vector3(),
    offset: new THREE.Vector3(),
    aim: new THREE.Vector3(),
    target: new THREE.Vector3(),
    pointer: new THREE.Vector2(),
    clock: 0,
    act: -1,
    roll: 0,
    started: false,
  }), [])

  useFrame((_, delta) => {
    const act = actAt(actIndex)
    const cam = act.camera
    // Paso real limitado: si el navegador congela la pestaña, el muelle no explode.
    const step = Math.min(delta, 1 / 30)

    if (rig.act !== actIndex) {
      rig.act = actIndex
      rig.clock = 0
    } else if (!reducedMotion) {
      rig.clock += step
    }

    // Progreso del acto, suavizado: el dolly y la grúa se recorren, no se saltan.
    const s = THREE.MathUtils.clamp(rig.clock / Math.max(1, act.duration), 0, 1)
    const glide = s * s * (3 - 2 * s)
    const a = cam.rate * rig.clock
    const off = rig.offset

    off.set(0, 0, 0)
    if (!reducedMotion) {
      switch (cam.path) {
        case 'orbit':
          off.x = Math.sin(a) * cam.swing
          off.z = (Math.cos(a) - 1) * cam.swing * 0.3
          off.y = Math.sin(a * 0.7) * cam.swing * 0.16
          off.z -= cam.dolly * glide * 0.4
          break
        case 'arc': {
          // Barrido acotado: la escena gira medio círculo y vuelve, sin dar vueltas.
          const sweep = THREE.MathUtils.clamp(a, -0.85, 0.85)
          off.x = Math.sin(sweep) * cam.swing
          off.z = (Math.cos(sweep) - 1) * cam.swing * 0.55
          off.y = Math.sin(sweep * 1.3) * cam.swing * 0.22
          off.z -= cam.dolly * glide * 0.3
          break
        }
        case 'crane':
          off.y = cam.rise * glide + Math.sin(a) * cam.swing * 0.18
          off.x = Math.sin(a) * cam.swing * 0.7
          off.z -= cam.dolly * glide * 0.55
          break
        case 'rise':
          off.y = cam.rise * glide
          off.z -= cam.dolly * glide * 0.4
          off.x = Math.sin(a) * cam.swing * 0.5
          break
        case 'pull':
        case 'push':
        default:
          // push y pull son el mismo eje; el signo de `dolly` decide.
          off.z -= cam.dolly * glide
          off.x = Math.sin(a) * cam.swing * 0.45
          off.y = Math.sin(a * 0.8 + 0.5) * cam.swing * 0.18
          break
      }

      // Micro-temblor de operador: dos senos inconmensurables, imperceptibles
      // como movimiento y decisivos como vida.
      off.x += Math.sin(rig.clock * 0.23) * cam.handheld + Math.sin(rig.clock * 0.61 + 1.7) * cam.handheld * 0.35
      off.y += Math.cos(rig.clock * 0.17 + 0.4) * cam.handheld
      off.z += Math.sin(rig.clock * 0.11 + 2.2) * cam.handheld * 0.6

      // En el warp la cámara atraviesa el portal: el corte se siente como viaje.
      const warp = env.current.warp
      off.z -= warp * 3.4
      off.x += warp * Math.sin(rig.clock * 2.1) * 0.5
    }

    // El puntero también se amortigua: sin esto, la parallax replica el temblor
    // de la mano y todo el encuadre se vuelve nervioso.
    const parallax = reducedMotion ? 0 : 1
    const gain = 0.55 + cam.swing * 0.08
    rig.pointer.x = THREE.MathUtils.damp(rig.pointer.x, pointer.x * parallax * gain, 3.2, step)
    rig.pointer.y = THREE.MathUtils.damp(rig.pointer.y, pointer.y * parallax * gain * 0.55, 3.2, step)

    const desired = rig.desired
    desired.set(cam.position[0], cam.position[1], cam.position[2])
    desired.add(off)
    desired.x += rig.pointer.x
    desired.y += rig.pointer.y

    // Punto de mira del acto, con un pequeño desplazamiento opuesto en el warp
    // para que el portal parezca pasar de largo en vez de abrirse al frente.
    rig.target.set(cam.target[0], cam.target[1], cam.target[2])
    if (!reducedMotion) rig.target.x -= env.current.warp * 0.4

    if (!rig.started) {
      rig.pos.copy(camera.position)
      rig.aim.set(cam.target[0], cam.target[1], cam.target[2])
      rig.started = true
    }

    if (reducedMotion) {
      // Con prefers-reduced-motion el encuadre se corta, no se viaja. Además es
      // lo único que funciona aquí: el Canvas corre en frameloop="demand" y un
      // muelle necesita frames para asentarse, así que se quedaría a medio
      // camino entre dos poses para siempre.
      rig.pos.copy(desired)
      rig.vel.set(0, 0, 0)
      rig.aim.copy(rig.target)
      rig.roll = 0
    } else {
      // Muelle críticamente amortiguado (zeta = 1). Frecuencia natural ~0.3 Hz:
      // unos 2 s de aproximación, que es el ritmo de un travelling largo.
      const omega = 2 * Math.PI * 0.3 * cam.stiffness
      const k = omega * omega
      const c = 2 * omega
      rig.vel.x += ((desired.x - rig.pos.x) * k - rig.vel.x * c) * step
      rig.vel.y += ((desired.y - rig.pos.y) * k - rig.vel.y * c) * step
      rig.vel.z += ((desired.z - rig.pos.z) * k - rig.vel.z * c) * step
      rig.pos.x += rig.vel.x * step
      rig.pos.y += rig.vel.y * step
      rig.pos.z += rig.vel.z * step

      // El objetivo va más lento que la posición: al cambiar de acto la cámara
      // gira un instante sobre sí misma en lugar de recomponer el encuadre de golpe.
      rig.aim.x = THREE.MathUtils.damp(rig.aim.x, rig.target.x, 1.7, step)
      rig.aim.y = THREE.MathUtils.damp(rig.aim.y, rig.target.y, 1.7, step)
      rig.aim.z = THREE.MathUtils.damp(rig.aim.z, rig.target.z, 1.7, step)

      // Alabeo inducido por la deriva lateral, con tope en radianes.
      const wanted = THREE.MathUtils.clamp(-rig.vel.x * 0.055, -cam.roll, cam.roll)
      rig.roll = THREE.MathUtils.damp(rig.roll, wanted + env.current.warp * 0.03, 2.6, step)
    }
    camera.position.copy(rig.pos)
    camera.up.set(Math.sin(rig.roll), Math.cos(rig.roll), 0)
    camera.lookAt(rig.aim)

    const perspective = camera as THREE.PerspectiveCamera
    if (perspective.isPerspectiveCamera) {
      // Respiración focal: los graves cierran el encuadre, el warp lo abre.
      const wanted = reducedMotion ? cam.fov : cam.fov - env.current.bass * 1.8 - env.current.level * 0.9 + env.current.warp * 9
      perspective.fov = reducedMotion ? wanted : THREE.MathUtils.damp(perspective.fov, wanted, 2.4, step)
      perspective.updateProjectionMatrix()
    }
  })

  return null
}

/** Sincroniza el nivel amortiguado en el env compartido, sin re-render de React. */
function EnvSync({ env }: { env: React.MutableRefObject<CinematicEnv> }) {
  useFrame((_, delta) => {
    const step = Math.min(delta, 1 / 30)
    env.current.level = THREE.MathUtils.damp(env.current.level, env.current.target, 9, step)
  })
  return null
}

/* ------------------------------------------------------------------ */
/* Nebula de fondo: esfera invertida con fbm, una sola draw call       */
/* ------------------------------------------------------------------ */
function Nebula({ actIndex, reducedMotion, env }: Pick<StageProps, 'actIndex' | 'reducedMotion' | 'env'>) {
  const mesh = useRef<THREE.Mesh>(null)

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uWarp: { value: 0 },
    uLevel: { value: 0 },
    uFog: { value: colorOf(actAt(0), 'fog') },
    uKey: { value: colorOf(actAt(0), 'key') },
    uEmber: { value: colorOf(actAt(0), 'ember') },
  }), [])

  // `args` reconstruye el ShaderMaterial si cambia por identidad: memoizado, el
  // material (y su compilación GLSL) sobrevive intacto al corte entre actos.
  const materialArgs = useMemo(
    () => [{ ...NEBULA_SHADER, uniforms, side: THREE.BackSide, depthWrite: false }] as [THREE.ShaderMaterialParameters],
    [uniforms],
  )

  useFrame((_, delta) => {
    const step = Math.min(delta, 1 / 30)
    const act = actAt(actIndex)
    if (!reducedMotion) uniforms.uTime.value += step
    ;(uniforms.uFog.value as THREE.Color).lerp(linear(act.palette.fog), step * 1.2)
    ;(uniforms.uKey.value as THREE.Color).lerp(linear(act.palette.key), step * 1.2)
    ;(uniforms.uEmber.value as THREE.Color).lerp(linear(act.palette.ember), step * 1.2)
    uniforms.uWarp.value = THREE.MathUtils.damp(uniforms.uWarp.value as number, env.current.warp, 4, step)
    uniforms.uLevel.value = THREE.MathUtils.damp(uniforms.uLevel.value as number, env.current.level, 6, step)
    if (mesh.current && !reducedMotion) {
      // Fondo contrarrotado: como la niebla se mueve en sentido contrario a la
      // cámara, el paralaje de profundidad se lee incluso en encuadres cerrados.
      mesh.current.rotation.y -= step * 0.008
      mesh.current.rotation.x = Math.sin(uniforms.uTime.value as number * 0.02) * 0.05
    }
  })

  return (
    <mesh ref={mesh} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[40, 40, 24]} />
      <shaderMaterial args={materialArgs} />
    </mesh>
  )
}

/* ------------------------------------------------------------------ */
/* Núcleo holográfico: icosaedro desplazado por ruido + jaula de alambre */
/* ------------------------------------------------------------------ */
function HolographicCore({ actIndex, quality, reducedMotion, env }: SceneNodeProps) {
  const group = useRef<THREE.Group>(null)
  const wire = useRef<THREE.Mesh>(null)
  const focus = useRef(1)
  const detail = quality === 'high' ? 4 : quality === 'medium' ? 3 : 2

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uLevel: { value: 0 },
    uBass: { value: 0 },
    uWarp: { value: 0 },
    uKey: { value: colorOf(actAt(0), 'key') },
    uCore: { value: colorOf(actAt(0), 'core') },
    uWarm: { value: colorOf(actAt(0), 'ember') },
  }), [])

  const materialArgs = useMemo(
    () => [{ ...CORE_SHADER, uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }] as [THREE.ShaderMaterialParameters],
    [uniforms],
  )

  useFrame((_, delta) => {
    const step = Math.min(delta, 1 / 30)
    const act = actAt(actIndex)
    if (!reducedMotion) uniforms.uTime.value += step
    ;(uniforms.uKey.value as THREE.Color).lerp(linear(act.palette.key), step * 1.2)
    ;(uniforms.uCore.value as THREE.Color).lerp(linear(act.palette.core), step * 1.2)
    ;(uniforms.uWarm.value as THREE.Color).lerp(linear(act.palette.ember), step * 1.2)
    uniforms.uLevel.value = THREE.MathUtils.damp(uniforms.uLevel.value as number, env.current.level, 7, step)
    uniforms.uBass.value = THREE.MathUtils.damp(uniforms.uBass.value as number, env.current.bass, 14, step)
    uniforms.uWarp.value = THREE.MathUtils.damp(uniforms.uWarp.value as number, env.current.warp, 5, step)

    focus.current = focusValue(focus.current, act.focus.core, step)

    if (group.current) {
      // El peso de foco decide cuánto manda el núcleo en el encuadre; el audio
      // sólo lo infla un pellizco, para que el golpe se sienta sin verse falso.
      const size = 0.78 + focus.current * 0.34 + env.current.level * 0.05 + env.current.bass * 0.08
      group.current.scale.setScalar(THREE.MathUtils.damp(group.current.scale.x, size, 3.2, step))
      if (!reducedMotion) {
        group.current.rotation.y += step * (0.12 + env.current.level * 0.5)
        group.current.rotation.x = Math.sin((uniforms.uTime.value as number) * 0.18) * 0.22
        // Flotación lentísima: un punto fijo en pantalla siempre se lee como imagen quieta.
        group.current.position.y = Math.sin((uniforms.uTime.value as number) * 0.31) * 0.09
      }
    }
    if (wire.current) {
      const wanted = 1.06 + env.current.level * 0.1 + env.current.bass * 0.22
      wire.current.scale.setScalar(THREE.MathUtils.damp(wire.current.scale.x, wanted, 6, step))
      wire.current.rotation.y -= step * 0.28
      const material = wire.current.material as THREE.MeshBasicMaterial
      material.color.lerp(linear(act.palette.key), step * 1.2)
      material.opacity = 0.03 + focus.current * 0.07
    }
  })

  return (
    <group ref={group}>
      <mesh>
        <icosahedronGeometry args={[1.74, detail]} />
        <shaderMaterial args={materialArgs} />
      </mesh>
      <mesh ref={wire}>
        <icosahedronGeometry args={[1.82, Math.max(1, detail - 2)]} />
        <meshBasicMaterial
          color={actAt(0).palette.key}
          wireframe
          transparent
          opacity={0.075}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Armilla: filetes finos que orbitan el núcleo, en distintas inclinaciones */
/* ------------------------------------------------------------------ */
function ArmillaryArcs({ actIndex, quality, reducedMotion, env }: SceneNodeProps) {
  const arcs = useMemo(() => [
    { radius: 2.35, tilt: [1.32, 0.2, 0.1] as [number, number, number], speed: 0.09, phase: 0, warm: false },
    { radius: 2.78, tilt: [0.42, -0.55, 0.9] as [number, number, number], speed: -0.06, phase: 0.37, warm: true },
    { radius: 3.24, tilt: [1.05, 0.9, -0.35] as [number, number, number], speed: 0.045, phase: 0.71, warm: false },
  ], [])

  const materials = useRef<THREE.ShaderMaterial[]>([])
  const groups = useRef<(THREE.Group | null)[]>([])
  const focus = useRef(1)

  // Args y callbacks de ref memoizados: el material no se recompila al cambiar
  // de acto y el callback de ref ya no se desmonta/monta en cada render.
  const arcArgs = useMemo(
    () =>
      arcs.map((arc, i): [THREE.ShaderMaterialParameters] => [
        {
          ...ARC_SHADER,
          uniforms: {
            uTime: { value: i * 5 },
            uLevel: { value: 0 },
            uWarp: { value: 0 },
            uSpeed: { value: arc.speed * 2.4 },
            uPhase: { value: arc.phase },
            uKey: { value: colorOf(actAt(0), 'key') },
            uWarm: { value: colorOf(actAt(0), 'ember') },
          },
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        },
      ]),
    [arcs],
  )

  const groupRefs = useMemo(
    () => arcs.map((_, i) => (node: THREE.Group | null) => { groups.current[i] = node }),
    [arcs],
  )
  const materialRefs = useMemo(
    () => arcs.map((_, i) => (node: THREE.ShaderMaterial | null) => { if (node) materials.current[i] = node }),
    [arcs],
  )

  useFrame((_, delta) => {
    const step = Math.min(delta, 1 / 30)
    const act = actAt(actIndex)
    focus.current = focusValue(focus.current, act.focus.arcs, step)
    materials.current.forEach((material, i) => {
      if (!material) return
      const u = material.uniforms
      if (!reducedMotion) u.uTime.value += step
      u.uLevel.value = THREE.MathUtils.damp(u.uLevel.value as number, env.current.level, 8, step)
      u.uWarp.value = THREE.MathUtils.damp(u.uWarp.value as number, env.current.warp, 5, step)
      ;(u.uKey.value as THREE.Color).lerp(linear(act.palette.key), step * 1.3)
      ;(u.uWarm.value as THREE.Color).lerp(linear(act.palette.ember), step * 1.3)
    })
    groups.current.forEach((node, i) => {
      if (!node) return
      // Cada filete abre o cierra su órbita según el foco, y acelera con el
      // nivel: los anillos se apartan cuando manda el núcleo y se ciernen cuando
      // manda la red.
      const radius = 0.86 + focus.current * 0.2 + env.current.level * 0.03
      node.scale.setScalar(THREE.MathUtils.damp(node.scale.x, radius, 2.6, step))
      if (!reducedMotion) node.rotation.z += step * arcs[i].speed * (0.6 + env.current.level * 0.7)
    })
  })

  const radial = quality === 'high' ? 160 : quality === 'medium' ? 110 : 64

  return (
    <group>
      {arcs.map((arc, i) => (
        <group key={arc.radius} ref={groupRefs[i]} rotation={arc.tilt}>
          <mesh>
            <torusGeometry args={[arc.radius, 0.0075, 6, radial]} />
            <shaderMaterial ref={materialRefs[i]} args={arcArgs[i]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Destello anamórfico: plano horizontal que siempre mira a cámara      */
/* ------------------------------------------------------------------ */
function AnamorphicStreak({ actIndex, reducedMotion, env }: Pick<StageProps, 'actIndex' | 'reducedMotion' | 'env'>) {
  const mesh = useRef<THREE.Mesh>(null)
  const focus = useRef(1)

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uLevel: { value: 0 },
    uBass: { value: 0 },
    uOpacity: { value: 0 },
    uKey: { value: colorOf(actAt(0), 'key') },
    uWarm: { value: colorOf(actAt(0), 'ember') },
  }), [])

  const materialArgs = useMemo(
    () => [{ ...STREAK_SHADER, uniforms, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }] as [THREE.ShaderMaterialParameters],
    [uniforms],
  )

  useFrame((state, delta) => {
    const step = Math.min(delta, 1 / 30)
    const act = actAt(actIndex)
    if (!reducedMotion) uniforms.uTime.value += step
    ;(uniforms.uKey.value as THREE.Color).lerp(linear(act.palette.key), step * 1.4)
    ;(uniforms.uWarm.value as THREE.Color).lerp(linear(act.palette.ember), step * 1.4)
    focus.current = focusValue(focus.current, act.focus.streak, step)
    uniforms.uLevel.value = THREE.MathUtils.damp(uniforms.uLevel.value as number, env.current.level, 9, step)
    uniforms.uBass.value = THREE.MathUtils.damp(uniforms.uBass.value as number, env.current.bass, 18, step)
    // El destello sigue al golpe de graves: es luz de óptica, no decoración.
    const wanted = (0.16 + env.current.bass * 0.9 + env.current.level * 0.35) * (0.35 + focus.current * 0.9)
    uniforms.uOpacity.value = THREE.MathUtils.damp(uniforms.uOpacity.value as number, Math.min(1.35, wanted), 7, step)
    if (mesh.current) {
      mesh.current.quaternion.copy(state.camera.quaternion)
      // La manga óptica se estira con el foco: en los actos de destello ocupa
      // casi todo el ancho del encuadre, en los de niebla es apenas una raya.
      const stretch = 0.55 + focus.current * 0.6 + env.current.bass * 0.12
      mesh.current.scale.set(
        THREE.MathUtils.damp(mesh.current.scale.x, stretch, 4, step),
        THREE.MathUtils.damp(mesh.current.scale.y, 0.7 + focus.current * 0.5, 4, step),
        1,
      )
    }
  })

  return (
    <mesh ref={mesh} position={[0, 0, 0]} renderOrder={4}>
      <planeGeometry args={[26, 1.1, 1, 1]} />
      <shaderMaterial args={materialArgs} />
    </mesh>
  )
}

/* ------------------------------------------------------------------ */
/* Anillos de energía: toros shaderizados (sin passes de transmisión)   */
/* ------------------------------------------------------------------ */
function EnergyRings({ actIndex, quality, reducedMotion, env }: SceneNodeProps) {
  const group = useRef<THREE.Group>(null)

  const specs = useMemo(() => [
    { radius: 5.4, tube: 0.026, speed: 0.22, tilt: [0.32, 0.1, 0] as [number, number, number] },
    { radius: 4.15, tube: 0.019, speed: -0.34, tilt: [-0.5, 0.28, 0.4] as [number, number, number] },
    { radius: 6.7, tube: 0.014, speed: 0.14, tilt: [0.9, -0.35, 0.2] as [number, number, number] },
  ], [])

  const materials = useRef<THREE.ShaderMaterial[]>([])
  const focus = useRef(1)
  const clock = useRef(0)

  const ringArgs = useMemo(
    () =>
      specs.map((spec, i): [THREE.ShaderMaterialParameters] => [
        {
          ...RING_SHADER,
          uniforms: {
            uTime: { value: i * 3 },
            uLevel: { value: 0 },
            uBass: { value: 0 },
            uWarp: { value: 0 },
            uSpeed: { value: spec.speed },
            uKey: { value: colorOf(actAt(0), 'key') },
            uEmber: { value: colorOf(actAt(0), 'ember') },
          },
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        },
      ]),
    [specs],
  )
  const materialRefs = useMemo(
    () => specs.map((_, i) => (node: THREE.ShaderMaterial | null) => { if (node) materials.current[i] = node }),
    [specs],
  )

  useFrame((_, delta) => {
    const step = Math.min(delta, 1 / 30)
    const act = actAt(actIndex)
    focus.current = focusValue(focus.current, act.focus.rings, step)
    if (group.current) {
      const size = 0.84 + focus.current * 0.24
      group.current.scale.setScalar(THREE.MathUtils.damp(group.current.scale.x, size, 2.4, step))
      if (!reducedMotion) {
        clock.current += step
        // Precesión: el conjunto gira sobre dos ejes, así los anillos nunca
        // vuelven a la misma silueta dentro del acto.
        group.current.rotation.y += step * (0.05 + env.current.level * 0.06)
        group.current.rotation.x = Math.sin(clock.current * 0.07) * 0.12
      }
    }
    materials.current.forEach((material, i) => {
      if (!material) return
      const u = material.uniforms
      if (!reducedMotion) u.uTime.value += step * (1 + i * 0.2)
      u.uLevel.value = THREE.MathUtils.damp(u.uLevel.value, env.current.level, 8, step)
      u.uBass.value = THREE.MathUtils.damp(u.uBass.value, env.current.bass, 15, step)
      u.uWarp.value = THREE.MathUtils.damp(u.uWarp.value, env.current.warp, 5, step)
      ;(u.uKey.value as THREE.Color).lerp(linear(act.palette.key), step * 1.2)
      ;(u.uEmber.value as THREE.Color).lerp(linear(act.palette.ember), step * 1.2)
    })
  })

  const radial = quality === 'high' ? 200 : quality === 'medium' ? 130 : 80

  return (
    <group ref={group}>
      {specs.map((spec, i) => (
        <mesh key={spec.radius} rotation={spec.tilt}>
          <torusGeometry args={[spec.radius, spec.tube, quality === 'low' ? 8 : 12, radial]} />
          <shaderMaterial ref={materialRefs[i]} args={ringArgs[i]} />
        </mesh>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Campo de partículas: un Points, una draw call, movimiento en GPU     */
/* ------------------------------------------------------------------ */
function ParticleField({ actIndex, quality, reducedMotion, env }: SceneNodeProps) {
  const count = PARTICLE_COUNT[quality]
  const points = useRef<THREE.Points>(null)
  const focus = useRef(1)
  /** Puntos dibujados amortiguados; arranca en el total para no abrir en vacío. */
  const drawn = useRef(count)
  const { gl } = useThree()

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const seed = new Float32Array(count * 3)
    const motion = new Float32Array(count * 3)
    const shape = new Float32Array(count * 3)
    const tint = new Float32Array(count)
    for (let i = 0; i < count; i += 1) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(THREE.MathUtils.lerp(-1, 1, Math.random() ** 1.4))
      const radius = 0.35 + Math.random() ** 0.6
      seed[i * 3] = Math.sin(phi) * Math.cos(theta) * radius
      seed[i * 3 + 1] = Math.cos(phi) * radius * 0.55
      seed[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius
      motion[i * 3] = 0.12 + Math.random() * 0.5
      motion[i * 3 + 1] = 0.25 + Math.random() * 1.35
      motion[i * 3 + 2] = 0.2 + Math.random() * 1.1
      shape[i * 3] = Math.random()
      shape[i * 3 + 1] = 0.35 + Math.random() * 1.9
      shape[i * 3 + 2] = Math.random()
      tint[i] = Math.random()
    }
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3))
    g.setAttribute('aMotion', new THREE.BufferAttribute(motion, 3))
    g.setAttribute('aShape', new THREE.BufferAttribute(shape, 3))
    g.setAttribute('aTint', new THREE.BufferAttribute(tint, 1))
    // three exige el atributo "position" aunque el vértice nazca en el shader.
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 80)
    return g
  }, [count])

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uLevel: { value: 0 },
    uTreble: { value: 0 },
    uWarp: { value: 0 },
    uSpread: { value: 18 },
    uPixelRatio: { value: 1 },
    uKey: { value: colorOf(actAt(0), 'key') },
    uEmber: { value: colorOf(actAt(0), 'ember') },
  }), [])

  const materialArgs = useMemo(
    () => [{ ...FIELD_SHADER, uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }] as [THREE.ShaderMaterialParameters],
    [uniforms],
  )

  // La geometría se construye fuera del reconciliador (useMemo), así que R3F no
  // la libera: al desmontar o cambiar de tier hay que hacer dispose a mano o
  // quedan ~600 KB de buffers huérfanos en GPU.
  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame((_, delta) => {
    const step = Math.min(delta, 1 / 30)
    const act = actAt(actIndex)
    focus.current = focusValue(focus.current, act.focus.field, step)
    if (!reducedMotion) uniforms.uTime.value += step
    ;(uniforms.uKey.value as THREE.Color).lerp(linear(act.palette.key), step * 1.4)
    ;(uniforms.uEmber.value as THREE.Color).lerp(linear(act.palette.ember), step * 1.4)
    uniforms.uLevel.value = THREE.MathUtils.damp(uniforms.uLevel.value as number, env.current.level, 6, step)
    uniforms.uTreble.value = THREE.MathUtils.damp(uniforms.uTreble.value as number, env.current.treble, 16, step)
    uniforms.uWarp.value = THREE.MathUtils.damp(uniforms.uWarp.value as number, env.current.warp, 5, step)
    // Con el warp el campo se contrae hacia el centro antes de la transición:
    // la pantalla se llena de partículas y luego se vacía de golpe.
    uniforms.uSpread.value = THREE.MathUtils.damp(
      uniforms.uSpread.value as number,
      15 + act.density * 7 - env.current.warp * 6,
      3,
      step,
    )
    uniforms.uPixelRatio.value = Math.min(gl.getPixelRatio(), 2)
    if (points.current && !reducedMotion) points.current.rotation.y += step * (0.014 + env.current.level * 0.02)

    // La densidad del acto y el foco cambían cuántos puntos se dibujan. Se hace
    // por frame, con el peso amortiguado, para que la nube no aparezca ni
    // desaparezca a saltos.
    const wanted = Math.max(160, Math.floor(count * act.density * (0.45 + focus.current * 0.55)))
    drawn.current = THREE.MathUtils.damp(drawn.current, wanted, 2.4, step)
    geometry.setDrawRange(0, Math.floor(drawn.current))
  })

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <shaderMaterial args={materialArgs} />
    </points>
  )
}

/* ------------------------------------------------------------------ */
/* Portal: vórtice aditivo que solo existe durante el warp             */
/* ------------------------------------------------------------------ */
function Portal({ actIndex, reducedMotion, env }: Pick<StageProps, 'actIndex' | 'reducedMotion' | 'env'>) {
  const mesh = useRef<THREE.Mesh>(null)

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uWarp: { value: 0 },
    uKey: { value: colorOf(actAt(0), 'key') },
    uEmber: { value: colorOf(actAt(0), 'ember') },
  }), [])

  const materialArgs = useMemo(
    () => [{ ...PORTAL_SHADER, uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }] as [THREE.ShaderMaterialParameters],
    [uniforms],
  )

  useFrame((state, delta) => {
    const step = Math.min(delta, 1 / 30)
    const act = actAt(actIndex)
    if (!reducedMotion) uniforms.uTime.value += step
    ;(uniforms.uKey.value as THREE.Color).lerp(linear(act.palette.key), step * 1.6)
    ;(uniforms.uEmber.value as THREE.Color).lerp(linear(act.palette.ember), step * 1.6)
    uniforms.uWarp.value = THREE.MathUtils.damp(uniforms.uWarp.value as number, env.current.warp, 5, step)
    if (mesh.current) {
      mesh.current.quaternion.copy(state.camera.quaternion)
      mesh.current.scale.setScalar(6 + (uniforms.uWarp.value as number) * 9)
    }
  })

  return (
    <mesh ref={mesh} position={[0, 0, -3]} renderOrder={5}>
      <circleGeometry args={[1, 96]} />
      <shaderMaterial args={materialArgs} />
    </mesh>
  )
}

/**
 * Grade de color vivo: expone, difumina y oscurece hacia los valores del acto.
 *
 * Se hace por frame sobre las instancias de los efectos, no con props de React,
 * para que el cambio de paleta sea un fundido de dos segundos y no un salto
 * cuando el guion avanza de escena.
 */
function Grade({ actIndex, quality, env }: Pick<StageProps, 'actIndex' | 'quality' | 'env'>) {
  const { gl } = useThree()
  const bloom = useRef<{ intensity: number } | null>(null)
  const vignette = useRef<{ darkness: number; offset: number } | null>(null)
  const state = useRef({ exposure: 1.1, bloom: 0.9, veil: 0.32 })

  useFrame((_, delta) => {
    const step = Math.min(delta, 1 / 30)
    const grade = actAt(actIndex).grade
    const warp = env.current.warp
    const ceiling = quality === 'low' ? 0.62 : quality === 'medium' ? 0.95 : 1.25

    state.current.exposure = THREE.MathUtils.damp(state.current.exposure, grade.exposure + warp * 0.22, 1.6, step)
    state.current.bloom = THREE.MathUtils.damp(state.current.bloom, Math.min(ceiling, grade.bloom + env.current.bass * 0.3), 2.4, step)
    state.current.veil = THREE.MathUtils.damp(state.current.veil, grade.veil, 1.6, step)

    gl.toneMappingExposure = state.current.exposure
    if (bloom.current) bloom.current.intensity = state.current.bloom
    if (vignette.current) {
      // La vela de color se traduce en viñeta: más vela, más borde comido.
      vignette.current.darkness = 0.5 + state.current.veil * 0.6
      vignette.current.offset = 0.46 - state.current.veil * 0.14
    }
  })

  return (
    <EffectComposer multisampling={quality === 'high' ? 2 : 0}>
      <Bloom
        ref={(node) => { bloom.current = node as unknown as { intensity: number } | null }}
        intensity={0.9}
        luminanceThreshold={0.4}
        luminanceSmoothing={0.28}
        mipmapBlur
        radius={0.78}
      />
      <Vignette
        ref={(node) => { vignette.current = node as unknown as { darkness: number; offset: number } | null }}
        darkness={0.7}
        offset={0.42}
        eskil={false}
      />
    </EffectComposer>
  )
}

export default function CinematicStage({ actIndex, quality, reducedMotion, env, onQualityDecline }: StageProps) {
  const invalidate = useThree((state) => state.invalidate)
  const performance = useThree((state) => state.performance)

  /* `AdaptiveDpr` sólo reacciona a `performance.current`, y `current` sólo baja
     si alguien llama a `performance.regress()`. Sin esto el pixel ratio era un
     no-op: se pedía el tier abajo pero la resolución nunca se ajustaba. Se pide
     el regress (baja el DPR ~50% durante ~200 ms) al caer de tier y en cada
     frame del warp, que es cuando la GPU está más cargada. */
  const handleDecline = useCallback(() => {
    performance.regress()
    onQualityDecline()
  }, [performance, onQualityDecline])

  useFrame(() => {
    if (env.current.warp > 0.05) performance.regress()
  })

  /* Con `frameloop="demand"` nadie pide frames, y casi todo el estado visual se
     mueve por amortiguación dentro de useFrame. En modo de movimiento reducido
     hay que solicitar una ráfaga corta al cambiar de acto: si no, el fundido de
     color y el encuadre nuevo se quedan en el primer paso del muelle. Una ráfaga
     de 90 frames (~1.5 s) converge y para; no hay animación continua. */
  useEffect(() => {
    if (!reducedMotion) return
    let frames = 0
    let handle = 0
    const burst = () => {
      invalidate()
      if ((frames += 1) < 90) handle = requestAnimationFrame(burst)
    }
    burst()
    return () => cancelAnimationFrame(handle)
  }, [actIndex, invalidate, reducedMotion])

  return (
    <>
      <PerformanceMonitor onDecline={handleDecline} flipflops={3} />
      <AdaptiveDpr />
      <EnvSync env={env} />
      <CameraRig actIndex={actIndex} reducedMotion={reducedMotion} env={env} />
      <Nebula actIndex={actIndex} reducedMotion={reducedMotion} env={env} />
      <HolographicCore actIndex={actIndex} quality={quality} reducedMotion={reducedMotion} env={env} />
      <ArmillaryArcs actIndex={actIndex} quality={quality} reducedMotion={reducedMotion} env={env} />
      <EnergyRings actIndex={actIndex} quality={quality} reducedMotion={reducedMotion} env={env} />
      <ParticleField actIndex={actIndex} quality={quality} reducedMotion={reducedMotion} env={env} />
      <Portal actIndex={actIndex} reducedMotion={reducedMotion} env={env} />
      <AnamorphicStreak actIndex={actIndex} reducedMotion={reducedMotion} env={env} />
      <Grade actIndex={actIndex} quality={quality} env={env} />
    </>
  )
}

export const ACT_COUNT = CINEMATIC_ACTS.length
