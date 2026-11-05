'use client'

import { useMemo, useRef } from 'react'
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
/* Cámara cinemática: pose por acto + parallax de puntero, amortiguada */
/* ------------------------------------------------------------------ */
function CameraRig({ actIndex, reducedMotion }: { actIndex: number; reducedMotion: boolean }) {
  const { camera, pointer } = useThree()
  const lookTarget = useMemo(() => new THREE.Vector3(), [])
  const desired = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, delta) => {
    const act = actAt(actIndex)
    const step = Math.min(delta, 1 / 30)

    desired.set(act.camera.position[0], act.camera.position[1], act.camera.position[2])
    if (!reducedMotion) {
      desired.x += pointer.x * 0.85
      desired.y += pointer.y * 0.45
    }

    camera.position.x = THREE.MathUtils.damp(camera.position.x, desired.x, 2.2, step)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, desired.y, 2.2, step)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, desired.z, 2.2, step)

    lookTarget.set(act.camera.target[0], act.camera.target[1], act.camera.target[2])
    camera.lookAt(lookTarget)

    const perspective = camera as THREE.PerspectiveCamera
    if (perspective.isPerspectiveCamera) {
      perspective.fov = THREE.MathUtils.damp(perspective.fov, act.camera.fov, 1.8, step)
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
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uWarp: { value: 0 },
    uLevel: { value: 0 },
    uFog: { value: colorOf(actAt(0), 'fog') },
    uKey: { value: colorOf(actAt(0), 'key') },
    uEmber: { value: colorOf(actAt(0), 'ember') },
  }), [])

  useFrame((_, delta) => {
    const step = Math.min(delta, 1 / 30)
    const act = actAt(actIndex)
    if (!reducedMotion) uniforms.uTime.value += step
    ;(uniforms.uFog.value as THREE.Color).lerp(colorOf(act, 'fog'), step * 1.2)
    ;(uniforms.uKey.value as THREE.Color).lerp(colorOf(act, 'key'), step * 1.2)
    ;(uniforms.uEmber.value as THREE.Color).lerp(colorOf(act, 'ember'), step * 1.2)
    uniforms.uWarp.value = THREE.MathUtils.damp(uniforms.uWarp.value as number, env.current.warp, 4, step)
    uniforms.uLevel.value = THREE.MathUtils.damp(uniforms.uLevel.value as number, env.current.level, 6, step)
  })

  return (
    <mesh renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[40, 40, 24]} />
      <shaderMaterial args={[{ ...NEBULA_SHADER, uniforms, side: THREE.BackSide, depthWrite: false }]} />
    </mesh>
  )
}

/* ------------------------------------------------------------------ */
/* Núcleo holográfico: icosaedro desplazado por ruido + jaula de alambre */
/* ------------------------------------------------------------------ */
function HolographicCore({ actIndex, quality, reducedMotion, env }: SceneNodeProps) {
  const group = useRef<THREE.Group>(null)
  const wire = useRef<THREE.Mesh>(null)
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

  useFrame((_, delta) => {
    const step = Math.min(delta, 1 / 30)
    const act = actAt(actIndex)
    if (!reducedMotion) uniforms.uTime.value += step
    ;(uniforms.uKey.value as THREE.Color).lerp(colorOf(act, 'key'), step * 1.2)
    ;(uniforms.uCore.value as THREE.Color).lerp(colorOf(act, 'core'), step * 1.2)
    ;(uniforms.uWarm.value as THREE.Color).lerp(colorOf(act, 'ember'), step * 1.2)
    uniforms.uLevel.value = THREE.MathUtils.damp(uniforms.uLevel.value as number, env.current.level, 7, step)
    uniforms.uBass.value = THREE.MathUtils.damp(uniforms.uBass.value as number, env.current.bass, 14, step)
    uniforms.uWarp.value = THREE.MathUtils.damp(uniforms.uWarp.value as number, env.current.warp, 5, step)

    if (group.current && !reducedMotion) {
      group.current.rotation.y += step * (0.12 + env.current.level * 0.5)
      group.current.rotation.x = Math.sin((uniforms.uTime.value as number) * 0.18) * 0.22
    }
    if (wire.current) {
      const wanted = 1.06 + env.current.level * 0.1 + env.current.bass * 0.22
      wire.current.scale.setScalar(THREE.MathUtils.damp(wire.current.scale.x, wanted, 6, step))
      wire.current.rotation.y -= step * 0.28
      const material = wire.current.material as THREE.MeshBasicMaterial
      material.color.lerp(colorOf(act, 'key'), step * 1.2)
    }
  })

  return (
    <group ref={group}>
      <mesh>
        <icosahedronGeometry args={[1.74, detail]} />
        <shaderMaterial
          args={[{ ...CORE_SHADER, uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }]}
        />
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

  useFrame((_, delta) => {
    const step = Math.min(delta, 1 / 30)
    const act = actAt(actIndex)
    materials.current.forEach((material, i) => {
      if (!material) return
      const u = material.uniforms
      if (!reducedMotion) u.uTime.value += step
      u.uLevel.value = THREE.MathUtils.damp(u.uLevel.value as number, env.current.level, 8, step)
      u.uWarp.value = THREE.MathUtils.damp(u.uWarp.value as number, env.current.warp, 5, step)
      ;(u.uKey.value as THREE.Color).lerp(colorOf(act, 'key'), step * 1.3)
      ;(u.uWarm.value as THREE.Color).lerp(colorOf(act, 'ember'), step * 1.3)
    })
    groups.current.forEach((node, i) => {
      if (node && !reducedMotion) node.rotation.z += step * arcs[i].speed * 0.6
    })
  })

  const radial = quality === 'high' ? 160 : quality === 'medium' ? 110 : 64

  return (
    <group>
      {arcs.map((arc, i) => (
        <group key={arc.radius} ref={(node) => { groups.current[i] = node }} rotation={arc.tilt}>
          <mesh>
            <torusGeometry args={[arc.radius, 0.0075, 6, radial]} />
            <shaderMaterial
              ref={(node) => { if (node) materials.current[i] = node }}
              args={[{
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
              }]}
            />
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

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uLevel: { value: 0 },
    uBass: { value: 0 },
    uOpacity: { value: 0 },
    uKey: { value: colorOf(actAt(0), 'key') },
    uWarm: { value: colorOf(actAt(0), 'ember') },
  }), [])

  useFrame((state, delta) => {
    const step = Math.min(delta, 1 / 30)
    const act = actAt(actIndex)
    if (!reducedMotion) uniforms.uTime.value += step
    ;(uniforms.uKey.value as THREE.Color).lerp(colorOf(act, 'key'), step * 1.4)
    ;(uniforms.uWarm.value as THREE.Color).lerp(colorOf(act, 'ember'), step * 1.4)
    uniforms.uLevel.value = THREE.MathUtils.damp(uniforms.uLevel.value as number, env.current.level, 9, step)
    uniforms.uBass.value = THREE.MathUtils.damp(uniforms.uBass.value as number, env.current.bass, 18, step)
    // El destello sigue al golpe de graves: es luz de óptica, no decoración.
    const wanted = 0.34 + env.current.bass * 0.9 + env.current.level * 0.35
    uniforms.uOpacity.value = THREE.MathUtils.damp(uniforms.uOpacity.value as number, wanted, 7, step)
    if (mesh.current) mesh.current.quaternion.copy(state.camera.quaternion)
  })

  return (
    <mesh ref={mesh} position={[0, 0, 0]} renderOrder={4}>
      <planeGeometry args={[26, 1.1, 1, 1]} />
      <shaderMaterial
        args={[{
          ...STREAK_SHADER,
          uniforms,
          transparent: true,
          depthWrite: false,
          depthTest: false,
          blending: THREE.AdditiveBlending,
        }]}
      />
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

  useFrame((_, delta) => {
    const step = Math.min(delta, 1 / 30)
    const act = actAt(actIndex)
    if (group.current && !reducedMotion) group.current.rotation.y += step * 0.05
    materials.current.forEach((material, i) => {
      if (!material) return
      const u = material.uniforms
      if (!reducedMotion) u.uTime.value += step * (1 + i * 0.2)
      u.uLevel.value = THREE.MathUtils.damp(u.uLevel.value, env.current.level, 8, step)
      u.uBass.value = THREE.MathUtils.damp(u.uBass.value, env.current.bass, 15, step)
      u.uWarp.value = THREE.MathUtils.damp(u.uWarp.value, env.current.warp, 5, step)
      ;(u.uKey.value as THREE.Color).lerp(colorOf(act, 'key'), step * 1.2)
      ;(u.uEmber.value as THREE.Color).lerp(colorOf(act, 'ember'), step * 1.2)
    })
  })

  const radial = quality === 'high' ? 200 : quality === 'medium' ? 130 : 80

  return (
    <group ref={group}>
      {specs.map((spec, i) => (
        <mesh key={spec.radius} rotation={spec.tilt}>
          <torusGeometry args={[spec.radius, spec.tube, quality === 'low' ? 8 : 12, radial]} />
          <shaderMaterial
            ref={(node) => { if (node) materials.current[i] = node }}
            args={[{
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
            }]}
          />
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

  useFrame((_, delta) => {
    const step = Math.min(delta, 1 / 30)
    const act = actAt(actIndex)
    if (!reducedMotion) uniforms.uTime.value += step
    ;(uniforms.uKey.value as THREE.Color).lerp(colorOf(act, 'key'), step * 1.4)
    ;(uniforms.uEmber.value as THREE.Color).lerp(colorOf(act, 'ember'), step * 1.4)
    uniforms.uLevel.value = THREE.MathUtils.damp(uniforms.uLevel.value as number, env.current.level, 6, step)
    uniforms.uTreble.value = THREE.MathUtils.damp(uniforms.uTreble.value as number, env.current.treble, 16, step)
    uniforms.uWarp.value = THREE.MathUtils.damp(uniforms.uWarp.value as number, env.current.warp, 5, step)
    uniforms.uSpread.value = THREE.MathUtils.damp(uniforms.uSpread.value as number, 15 + act.density * 7, 3, step)
    uniforms.uPixelRatio.value = Math.min(gl.getPixelRatio(), 2)
    if (points.current && !reducedMotion) points.current.rotation.y += step * 0.014
  })

  // La densidad del acto cambia cuántos puntos se dibujan, sin re-crear buffers.
  const drawCount = Math.max(160, Math.floor(count * actAt(actIndex).density))
  geometry.setDrawRange(0, drawCount)

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        args={[{
          ...FIELD_SHADER,
          uniforms,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }]}
      />
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

  useFrame((state, delta) => {
    const step = Math.min(delta, 1 / 30)
    const act = actAt(actIndex)
    if (!reducedMotion) uniforms.uTime.value += step
    ;(uniforms.uKey.value as THREE.Color).lerp(colorOf(act, 'key'), step * 1.6)
    ;(uniforms.uEmber.value as THREE.Color).lerp(colorOf(act, 'ember'), step * 1.6)
    uniforms.uWarp.value = THREE.MathUtils.damp(uniforms.uWarp.value as number, env.current.warp, 5, step)
    if (mesh.current) {
      mesh.current.quaternion.copy(state.camera.quaternion)
      mesh.current.scale.setScalar(6 + (uniforms.uWarp.value as number) * 9)
    }
  })

  return (
    <mesh ref={mesh} position={[0, 0, -3]} renderOrder={5}>
      <circleGeometry args={[1, 96]} />
      <shaderMaterial
        args={[{ ...PORTAL_SHADER, uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }]}
      />
    </mesh>
  )
}

export default function CinematicStage({ actIndex, quality, reducedMotion, env, onQualityDecline }: StageProps) {
  return (
    <>
      <PerformanceMonitor onDecline={onQualityDecline} flipflops={3} />
      <AdaptiveDpr />
      <EnvSync env={env} />
      <CameraRig actIndex={actIndex} reducedMotion={reducedMotion} />
      <Nebula actIndex={actIndex} reducedMotion={reducedMotion} env={env} />
      <HolographicCore actIndex={actIndex} quality={quality} reducedMotion={reducedMotion} env={env} />
      <ArmillaryArcs actIndex={actIndex} quality={quality} reducedMotion={reducedMotion} env={env} />
      <EnergyRings actIndex={actIndex} quality={quality} reducedMotion={reducedMotion} env={env} />
      <ParticleField actIndex={actIndex} quality={quality} reducedMotion={reducedMotion} env={env} />
      <Portal actIndex={actIndex} reducedMotion={reducedMotion} env={env} />
      <AnamorphicStreak actIndex={actIndex} reducedMotion={reducedMotion} env={env} />
      <EffectComposer multisampling={quality === 'high' ? 2 : 0}>
        <Bloom
          intensity={quality === 'low' ? 0.55 : 0.92}
          luminanceThreshold={0.42}
          luminanceSmoothing={0.32}
          mipmapBlur
          radius={0.72}
        />
        <Vignette darkness={0.72} offset={0.42} eskil={false} />
      </EffectComposer>
    </>
  )
}

export const ACT_COUNT = CINEMATIC_ACTS.length
