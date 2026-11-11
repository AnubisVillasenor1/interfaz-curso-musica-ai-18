'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'

import {
  actAt,
  CINEMATIC_ACTS,
  type CinematicAct,
} from '@/lib/cinematic/scenes'
import {
  ARC_SHADER,
  FIELD_SHADER,
  NEBULA_SHADER,
  PORTAL_SHADER,
  RING_SHADER,
  STREAK_SHADER,
} from '@/lib/cinematic/shaders'
import type {
  CinematicEnv,
  QualityTier,
} from '@/lib/cinematic/quality'

/* ------------------------------------------------------------------ */
/* Constantes y utilidades                                             */
/* ------------------------------------------------------------------ */

const MAX_DELTA = 1 / 30

const PARTICLE_COUNT: Record<QualityTier, number> = {
  low: 2_200,
  medium: 6_500,
  high: 13_000,
}

const ARC_RADIAL_SEGMENTS: Record<QualityTier, number> = {
  low: 64,
  medium: 110,
  high: 160,
}

const RING_RADIAL_SEGMENTS: Record<QualityTier, number> = {
  low: 80,
  medium: 130,
  high: 200,
}

const linearColorCache = new Map<string, THREE.Color>()

function linearColor(hex: string): THREE.Color {
  const cached = linearColorCache.get(hex)

  if (cached) {
    return cached
  }

  const color = new THREE.Color(hex)
  linearColorCache.set(hex, color)

  return color
}

function paletteColor(
  act: CinematicAct,
  key: keyof CinematicAct['palette'],
): THREE.Color {
  return linearColor(act.palette[key]).clone()
}

function clampDelta(delta: number): number {
  return Math.min(delta, MAX_DELTA)
}

function dampFocus(
  current: number,
  target: number,
  delta: number,
): number {
  return THREE.MathUtils.damp(current, target, 2, delta)
}

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

interface StageProps {
  actIndex: number
  quality: QualityTier
  reducedMotion: boolean
  env: React.RefObject<CinematicEnv | null>
  onQualityDecline: () => void
}

type SceneNodeProps = Pick<
  StageProps,
  'actIndex' | 'quality' | 'reducedMotion' | 'env'
>

type CameraNodeProps = Pick<
  StageProps,
  'actIndex' | 'reducedMotion' | 'env'
>

/* ------------------------------------------------------------------ */
/* Hook: sincronización de paleta y ambiente                           */
/* ------------------------------------------------------------------ */

interface PaletteUniforms {
  uKey: { value: THREE.Color }
  uWarm?: { value: THREE.Color }
  uEmber?: { value: THREE.Color }
  uFog?: { value: THREE.Color }
  uCore?: { value: THREE.Color }
}

function usePaletteSync(
  uniforms: PaletteUniforms,
  actIndex: number,
  env: React.RefObject<CinematicEnv | null>,
  options?: {
    colorLerp?: number
    levelDamping?: number
    bassDamping?: number
    warpDamping?: number
  },
) {
  const {
    colorLerp = 1.2,
    levelDamping = 7,
    bassDamping = 14,
    warpDamping = 5,
  } = options ?? {}

  useFrame((_, delta) => {
    const environment = env.current

    if (!environment) {
      return
    }

    const step = clampDelta(delta)
    const act = actAt(actIndex)

    uniforms.uKey.value.lerp(
      linearColor(act.palette.key),
      step * colorLerp,
    )

    uniforms.uWarm?.value.lerp(
      linearColor(act.palette.ember),
      step * colorLerp,
    )

    uniforms.uEmber?.value.lerp(
      linearColor(act.palette.ember),
      step * colorLerp,
    )

    uniforms.uFog?.value.lerp(
      linearColor(act.palette.fog),
      step * colorLerp,
    )

    uniforms.uCore?.value.lerp(
      linearColor(act.palette.core),
      step * colorLerp,
    )

    if ('uLevel' in uniforms) {
      const level = uniforms.uLevel as { value: number }
      level.value = THREE.MathUtils.damp(
        level.value,
        environment.level,
        levelDamping,
        step,
      )
    }

    if ('uBass' in uniforms) {
      const bass = uniforms.uBass as { value: number }
      bass.value = THREE.MathUtils.damp(
        bass.value,
        environment.bass,
        bassDamping,
        step,
      )
    }

    if ('uWarp' in uniforms) {
      const warp = uniforms.uWarp as { value: number }
      warp.value = THREE.MathUtils.damp(
        warp.value,
        environment.warp,
        warpDamping,
        step,
      )
    }
  })
}

/* ------------------------------------------------------------------ */
/* Cámara cinemática                                                   */
/* ------------------------------------------------------------------ */

function CameraRig({
  actIndex,
  reducedMotion,
  env,
}: CameraNodeProps) {
  const camera = useThree((state) => state.camera)
  const pointer = useThree((state) => state.pointer)

  const rig = useMemo(
    () => ({
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      desired: new THREE.Vector3(),
      offset: new THREE.Vector3(),
      aim: new THREE.Vector3(),
      target: new THREE.Vector3(),
      pointer: new THREE.Vector2(),
      clock: 0,
      actIndex: -1,
      roll: 0,
      started: false,
    }),
    [],
  )

  useFrame((_, delta) => {
    const environment = env.current

    if (!environment) {
      return
    }

    const act = actAt(actIndex)
    const cameraConfig = act.camera
    const step = clampDelta(delta)

    if (rig.actIndex !== actIndex) {
      rig.actIndex = actIndex
      rig.clock = 0
    } else if (!reducedMotion) {
      rig.clock += step
    }

    const progress = THREE.MathUtils.clamp(
      rig.clock / Math.max(1, act.duration),
      0,
      1,
    )

    const glide = progress * progress * (3 - 2 * progress)
    const angle = cameraConfig.rate * rig.clock
    const offset = rig.offset

    offset.set(0, 0, 0)

    if (!reducedMotion) {
      switch (cameraConfig.path) {
        case 'orbit':
          offset.x = Math.sin(angle) * cameraConfig.swing
          offset.z =
            (Math.cos(angle) - 1) * cameraConfig.swing * 0.3
          offset.y =
            Math.sin(angle * 0.7) * cameraConfig.swing * 0.16
          offset.z -= cameraConfig.dolly * glide * 0.4
          break

        case 'arc': {
          const sweep = THREE.MathUtils.clamp(angle, -0.85, 0.85)

          offset.x = Math.sin(sweep) * cameraConfig.swing
          offset.z =
            (Math.cos(sweep) - 1) * cameraConfig.swing * 0.55
          offset.y =
            Math.sin(sweep * 1.3) * cameraConfig.swing * 0.22
          offset.z -= cameraConfig.dolly * glide * 0.3
          break
        }

        case 'crane':
          offset.y =
            cameraConfig.rise * glide +
            Math.sin(angle) * cameraConfig.swing * 0.18
          offset.x =
            Math.sin(angle) * cameraConfig.swing * 0.7
          offset.z -= cameraConfig.dolly * glide * 0.55
          break

        case 'rise':
          offset.y = cameraConfig.rise * glide
          offset.z -= cameraConfig.dolly * glide * 0.4
          offset.x =
            Math.sin(angle) * cameraConfig.swing * 0.5
          break

        case 'pull':
        case 'push':
        default:
          offset.z -= cameraConfig.dolly * glide
          offset.x =
            Math.sin(angle) * cameraConfig.swing * 0.45
          offset.y =
            Math.sin(angle * 0.8 + 0.5) *
            cameraConfig.swing *
            0.18
          break
      }

      offset.x +=
        Math.sin(rig.clock * 0.23) * cameraConfig.handheld +
        Math.sin(rig.clock * 0.61 + 1.7) *
          cameraConfig.handheld *
          0.35

      offset.y +=
        Math.cos(rig.clock * 0.17 + 0.4) *
        cameraConfig.handheld

      offset.z +=
        Math.sin(rig.clock * 0.11 + 2.2) *
        cameraConfig.handheld *
        0.6

      const warp = environment.warp

      offset.z -= warp * 3.4
      offset.x += warp * Math.sin(rig.clock * 2.1) * 0.5
    }

    const parallax = reducedMotion ? 0 : 1
    const gain = 0.55 + cameraConfig.swing * 0.08

    rig.pointer.x = THREE.MathUtils.damp(
      rig.pointer.x,
      pointer.x * parallax * gain,
      3.2,
      step,
    )

    rig.pointer.y = THREE.MathUtils.damp(
      rig.pointer.y,
      pointer.y * parallax * gain * 0.55,
      3.2,
      step,
    )

    const desired = rig.desired

    desired.set(
      cameraConfig.position[0],
      cameraConfig.position[1],
      cameraConfig.position[2],
    )

    desired.add(offset)
    desired.x += rig.pointer.x
    desired.y += rig.pointer.y

    rig.target.set(
      cameraConfig.target[0],
      cameraConfig.target[1],
      cameraConfig.target[2],
    )

    if (!reducedMotion) {
      rig.target.x -= environment.warp * 0.4
    }

    if (!rig.started) {
      rig.position.copy(camera.position)
      rig.aim.set(
        cameraConfig.target[0],
        cameraConfig.target[1],
        cameraConfig.target[2],
      )
      rig.started = true
    }

    if (reducedMotion) {
      rig.position.copy(desired)
      rig.velocity.set(0, 0, 0)
      rig.aim.copy(rig.target)
      rig.roll = 0
    } else {
      const omega = 2 * Math.PI * 0.3 * cameraConfig.stiffness
      const stiffness = omega * omega
      const damping = 2 * omega

      rig.velocity.x +=
        ((desired.x - rig.position.x) * stiffness -
          rig.velocity.x * damping) *
        step

      rig.velocity.y +=
        ((desired.y - rig.position.y) * stiffness -
          rig.velocity.y * damping) *
        step

      rig.velocity.z +=
        ((desired.z - rig.position.z) * stiffness -
          rig.velocity.z * damping) *
        step

      rig.position.x += rig.velocity.x * step
      rig.position.y += rig.velocity.y * step
      rig.position.z += rig.velocity.z * step

      rig.aim.x = THREE.MathUtils.damp(
        rig.aim.x,
        rig.target.x,
        1.7,
        step,
      )

      rig.aim.y = THREE.MathUtils.damp(
        rig.aim.y,
        rig.target.y,
        1.7,
        step,
      )

      rig.aim.z = THREE.MathUtils.damp(
        rig.aim.z,
        rig.target.z,
        1.7,
        step,
      )

      const targetRoll = THREE.MathUtils.clamp(
        -rig.velocity.x * 0.055,
        -cameraConfig.roll,
        cameraConfig.roll,
      )

      rig.roll = THREE.MathUtils.damp(
        rig.roll,
        targetRoll + environment.warp * 0.03,
        2.6,
        step,
      )
    }

    camera.position.copy(rig.position)
    camera.up.set(Math.sin(rig.roll), Math.cos(rig.roll), 0)
    camera.lookAt(rig.aim)

    if (camera instanceof THREE.PerspectiveCamera) {
      const targetFov = reducedMotion
        ? cameraConfig.fov
        : cameraConfig.fov -
          environment.bass * 1.8 -
          environment.level * 0.9 +
          environment.warp * 9

      camera.fov = reducedMotion
        ? targetFov
        : THREE.MathUtils.damp(
            camera.fov,
            targetFov,
            2.4,
            step,
          )

      camera.updateProjectionMatrix()
    }
  })

  return null
}

/* ------------------------------------------------------------------ */
/* Sincronización ambiental                                            */
/* ------------------------------------------------------------------ */

function EnvSync({
  env,
}: {
  env: React.RefObject<CinematicEnv | null>
}) {
  useFrame((_, delta) => {
    const environment = env.current

    if (!environment) {
      return
    }

    const step = clampDelta(delta)

    environment.level = THREE.MathUtils.damp(
      environment.level,
      environment.target,
      9,
      step,
    )
  })

  return null
}

/* ------------------------------------------------------------------ */
/* Nebulosa                                                            */
/* ------------------------------------------------------------------ */

function Nebula({
  actIndex,
  reducedMotion,
  env,
}: Pick<StageProps, 'actIndex' | 'reducedMotion' | 'env'>) {
  const meshRef = useRef<THREE.Mesh>(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWarp: { value: 0 },
      uLevel: { value: 0 },
      uFog: { value: paletteColor(actAt(0), 'fog') },
      uKey: { value: paletteColor(actAt(0), 'key') },
      uEmber: { value: paletteColor(actAt(0), 'ember') },
    }),
    [],
  )

  const materialArgs = useMemo(
    () => [{
      ...NEBULA_SHADER,
      uniforms,
      side: THREE.BackSide,
      depthWrite: false,
    }] as [THREE.ShaderMaterialParameters],
    [uniforms],
  )

  usePaletteSync(uniforms, actIndex, env, {
    levelDamping: 6,
    warpDamping: 4,
  })

  useFrame((_, delta) => {
    if (reducedMotion) {
      return
    }

    const step = clampDelta(delta)

    uniforms.uTime.value += step

    if (meshRef.current) {
      meshRef.current.rotation.y -= step * 0.008
      meshRef.current.rotation.x =
        Math.sin(uniforms.uTime.value * 0.02) * 0.05
    }
  })

  return (
    <mesh
      ref={meshRef}
      renderOrder={-10}
      frustumCulled={false}
    >
      <sphereGeometry args={[40, 40, 24]} />
      <shaderMaterial args={materialArgs} />
    </mesh>
  )
}

/* ------------------------------------------------------------------ */
/* Espectro sonoro reactivo                                            */
/* ------------------------------------------------------------------ */

function ReactiveSpectrum({ actIndex, reducedMotion, env }: SceneNodeProps) {
  const barsRef = useRef<THREE.InstancedMesh>(null)
  const focusRef = useRef(1)
  const clockRef = useRef(0)
  const helper = useMemo(() => new THREE.Object3D(), [])
  const barCount = 84
  const rows = 3
  const count = barCount * rows
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({
      color: actAt(0).palette.key,
      transparent: true,
      opacity: 0.78,
      toneMapped: false,
    }),
    [],
  )

  useFrame((_, delta) => {
    const environment = env.current
    const bars = barsRef.current
    if (!environment || !bars) return

    const step = clampDelta(delta)
    const act = actAt(actIndex)
    if (!reducedMotion) clockRef.current += step
    focusRef.current = dampFocus(focusRef.current, act.focus.core, step)
    material.color.lerp(linearColor(act.palette.key), step * 1.4)

    for (let row = 0; row < rows; row += 1) {
      for (let index = 0; index < barCount; index += 1) {
        const position = index / (barCount - 1)
        const envelope = 0.16 + 0.84 * Math.pow(Math.sin(position * Math.PI), 0.55)
        const beat = Math.abs(Math.sin(position * 18 + clockRef.current * (2.2 + row * 0.22)))
        const overtone = 0.5 + 0.5 * Math.sin(position * 47 - clockRef.current * 1.35 + row)
        const height = (0.2 + beat * 1.05 + overtone * 0.38 + environment.bass * 0.8) * envelope * (0.72 + focusRef.current * 0.28)
        const x = (position - 0.5) * 10.6

        helper.position.set(x, height * 0.5 - 2.3, (row - 1) * 0.55)
        helper.scale.set(0.075, height, 0.055)
        helper.updateMatrix()
        bars.setMatrixAt(row * barCount + index, helper.matrix)
      }
    }

    bars.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={barsRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <primitive object={material} attach="material" />
    </instancedMesh>
  )
}

/* ------------------------------------------------------------------ */
/* Arcos armilares                                                     */
/* ------------------------------------------------------------------ */

interface ArcSpec {
  radius: number
  tilt: [number, number, number]
  speed: number
  phase: number
}

const ARMILLARY_ARCS: ArcSpec[] = [
  {
    radius: 2.35,
    tilt: [1.32, 0.2, 0.1],
    speed: 0.09,
    phase: 0,
  },
  {
    radius: 2.78,
    tilt: [0.42, -0.55, 0.9],
    speed: -0.06,
    phase: 0.37,
  },
  {
    radius: 3.24,
    tilt: [1.05, 0.9, -0.35],
    speed: 0.045,
    phase: 0.71,
  },
]

function ArmillaryArcs({
  actIndex,
  quality,
  reducedMotion,
  env,
}: SceneNodeProps) {
  const groupRefs = useRef<(THREE.Group | null)[]>([])
  const materialRefs = useRef<(THREE.ShaderMaterial | null)[]>([])
  const focusRef = useRef(1)

  const radialSegments = ARC_RADIAL_SEGMENTS[quality]

  const materialArgs = useMemo(
    () =>
      ARMILLARY_ARCS.map((arc, index): [THREE.ShaderMaterialParameters] => [{
        ...ARC_SHADER,
        uniforms: {
          uTime: { value: index * 5 },
          uLevel: { value: 0 },
          uWarp: { value: 0 },
          uSpeed: { value: arc.speed * 2.4 },
          uPhase: { value: arc.phase },
          uKey: { value: paletteColor(actAt(0), 'key') },
          uWarm: { value: paletteColor(actAt(0), 'ember') },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }]),
    [],
  )

  useFrame((_, delta) => {
    const environment = env.current

    if (!environment) {
      return
    }

    const step = clampDelta(delta)
    const act = actAt(actIndex)

    focusRef.current = dampFocus(
      focusRef.current,
      act.focus.arcs,
      step,
    )

    materialRefs.current.forEach((material) => {
      if (!material) {
        return
      }

      const uniforms = material.uniforms

      if (!reducedMotion) {
        uniforms.uTime.value += step
      }

      uniforms.uLevel.value = THREE.MathUtils.damp(
        uniforms.uLevel.value,
        environment.level,
        8,
        step,
      )

      uniforms.uWarp.value = THREE.MathUtils.damp(
        uniforms.uWarp.value,
        environment.warp,
        5,
        step,
      )

      uniforms.uKey.value.lerp(
        linearColor(act.palette.key),
        step * 1.3,
      )

      uniforms.uWarm.value.lerp(
        linearColor(act.palette.ember),
        step * 1.3,
      )
    })

    groupRefs.current.forEach((group, index) => {
      if (!group) {
        return
      }

      const targetScale =
        0.86 +
        focusRef.current * 0.2 +
        environment.level * 0.03

      group.scale.setScalar(
        THREE.MathUtils.damp(
          group.scale.x,
          targetScale,
          2.6,
          step,
        ),
      )

      if (!reducedMotion) {
        group.rotation.z +=
          step *
          ARMILLARY_ARCS[index].speed *
          (0.6 + environment.level * 0.7)
      }
    })
  })

  return (
    <group>
      {ARMILLARY_ARCS.map((arc, index) => (
        <group
          key={arc.radius}
          ref={(node) => {
            groupRefs.current[index] = node
          }}
          rotation={arc.tilt}
        >
          <mesh>
            <torusGeometry
              args={[arc.radius, 0.0075, 6, radialSegments]}
            />
            <shaderMaterial
              ref={(node) => {
                materialRefs.current[index] = node
              }}
              args={materialArgs[index]}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Destello anamórfico                                                 */
/* ------------------------------------------------------------------ */

function AnamorphicStreak({
  actIndex,
  reducedMotion,
  env,
}: Pick<StageProps, 'actIndex' | 'reducedMotion' | 'env'>) {
  const meshRef = useRef<THREE.Mesh>(null)
  const focusRef = useRef(1)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uLevel: { value: 0 },
      uBass: { value: 0 },
      uOpacity: { value: 0 },
      uKey: { value: paletteColor(actAt(0), 'key') },
      uWarm: { value: paletteColor(actAt(0), 'ember') },
    }),
    [],
  )

  const materialArgs = useMemo(
    () => [{
      ...STREAK_SHADER,
      uniforms,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    }] as [THREE.ShaderMaterialParameters],
    [uniforms],
  )

  useFrame((state, delta) => {
    const environment = env.current

    if (!environment) {
      return
    }

    const step = clampDelta(delta)
    const act = actAt(actIndex)

    if (!reducedMotion) {
      uniforms.uTime.value += step
    }

    uniforms.uKey.value.lerp(
      linearColor(act.palette.key),
      step * 1.4,
    )

    uniforms.uWarm.value.lerp(
      linearColor(act.palette.ember),
      step * 1.4,
    )

    focusRef.current = dampFocus(
      focusRef.current,
      act.focus.streak,
      step,
    )

    uniforms.uLevel.value = THREE.MathUtils.damp(
      uniforms.uLevel.value,
      environment.level,
      9,
      step,
    )

    uniforms.uBass.value = THREE.MathUtils.damp(
      uniforms.uBass.value,
      environment.bass,
      18,
      step,
    )

    const targetOpacity =
      (0.16 +
        environment.bass * 0.9 +
        environment.level * 0.35) *
      (0.35 + focusRef.current * 0.9)

    uniforms.uOpacity.value = THREE.MathUtils.damp(
      uniforms.uOpacity.value,
      Math.min(1.35, targetOpacity),
      7,
      step,
    )

    if (meshRef.current) {
      meshRef.current.quaternion.copy(state.camera.quaternion)

      const targetStretch =
        0.55 + focusRef.current * 0.6 + environment.bass * 0.12

      meshRef.current.scale.set(
        THREE.MathUtils.damp(
          meshRef.current.scale.x,
          targetStretch,
          4,
          step,
        ),
        THREE.MathUtils.damp(
          meshRef.current.scale.y,
          0.7 + focusRef.current * 0.5,
          4,
          step,
        ),
        1,
      )
    }
  })

  return (
    <mesh
      ref={meshRef}
      position={[0, 0, 0]}
      renderOrder={4}
    >
      <planeGeometry args={[26, 1.1, 1, 1]} />
      <shaderMaterial args={materialArgs} />
    </mesh>
  )
}

/* ------------------------------------------------------------------ */
/* Anillos de energía                                                  */
/* ------------------------------------------------------------------ */

interface RingSpec {
  radius: number
  tube: number
  speed: number
  tilt: [number, number, number]
}

const ENERGY_RINGS: RingSpec[] = [
  {
    radius: 5.4,
    tube: 0.026,
    speed: 0.22,
    tilt: [0.32, 0.1, 0],
  },
  {
    radius: 4.15,
    tube: 0.019,
    speed: -0.34,
    tilt: [-0.5, 0.28, 0.4],
  },
  {
    radius: 6.7,
    tube: 0.014,
    speed: 0.14,
    tilt: [0.9, -0.35, 0.2],
  },
]

function EnergyRings({
  actIndex,
  quality,
  reducedMotion,
  env,
}: SceneNodeProps) {
  const groupRef = useRef<THREE.Group>(null)
  const materialRefs = useRef<(THREE.ShaderMaterial | null)[]>([])
  const focusRef = useRef(1)
  const clockRef = useRef(0)

  const radialSegments = RING_RADIAL_SEGMENTS[quality]

  const materialArgs = useMemo(
    () =>
      ENERGY_RINGS.map((ring, index): [THREE.ShaderMaterialParameters] => [{
        ...RING_SHADER,
        uniforms: {
          uTime: { value: index * 3 },
          uLevel: { value: 0 },
          uBass: { value: 0 },
          uWarp: { value: 0 },
          uSpeed: { value: ring.speed },
          uKey: { value: paletteColor(actAt(0), 'key') },
          uEmber: { value: paletteColor(actAt(0), 'ember') },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }]),
    [],
  )

  useFrame((_, delta) => {
    const environment = env.current

    if (!environment) {
      return
    }

    const step = clampDelta(delta)
    const act = actAt(actIndex)

    focusRef.current = dampFocus(
      focusRef.current,
      act.focus.rings,
      step,
    )

    if (groupRef.current) {
      const targetScale =
        0.84 + focusRef.current * 0.24

      groupRef.current.scale.setScalar(
        THREE.MathUtils.damp(
          groupRef.current.scale.x,
          targetScale,
          2.4,
          step,
        ),
      )

      if (!reducedMotion) {
        clockRef.current += step

        groupRef.current.rotation.y +=
          step * (0.05 + environment.level * 0.06)

        groupRef.current.rotation.x =
          Math.sin(clockRef.current * 0.07) * 0.12
      }
    }

    materialRefs.current.forEach((material, index) => {
      if (!material) {
        return
      }

      const uniforms = material.uniforms

      if (!reducedMotion) {
        uniforms.uTime.value += step * (1 + index * 0.2)
      }

      uniforms.uLevel.value = THREE.MathUtils.damp(
        uniforms.uLevel.value,
        environment.level,
        8,
        step,
      )

      uniforms.uBass.value = THREE.MathUtils.damp(
        uniforms.uBass.value,
        environment.bass,
        15,
        step,
      )

      uniforms.uWarp.value = THREE.MathUtils.damp(
        uniforms.uWarp.value,
        environment.warp,
        5,
        step,
      )

      uniforms.uKey.value.lerp(
        linearColor(act.palette.key),
        step * 1.2,
      )

      uniforms.uEmber.value.lerp(
        linearColor(act.palette.ember),
        step * 1.2,
      )
    })
  })

  return (
    <group ref={groupRef}>
      {ENERGY_RINGS.map((ring, index) => (
        <mesh key={ring.radius} rotation={ring.tilt}>
          <torusGeometry
            args={[
              ring.radius,
              ring.tube,
              quality === 'low' ? 8 : 12,
              radialSegments,
            ]}
          />
          <shaderMaterial
            ref={(node) => {
              materialRefs.current[index] = node
            }}
            args={materialArgs[index]}
          />
        </mesh>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Campo de partículas                                                 */
/* ------------------------------------------------------------------ */

function createParticleGeometry(count: number): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()

  const seed = new Float32Array(count * 3)
  const motion = new Float32Array(count * 3)
  const shape = new Float32Array(count * 3)
  const tint = new Float32Array(count)

  for (let index = 0; index < count; index += 1) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(
      THREE.MathUtils.lerp(-1, 1, Math.random() ** 1.4),
    )
    const radius = 0.35 + Math.random() ** 0.6

    seed[index * 3] =
      Math.sin(phi) * Math.cos(theta) * radius
    seed[index * 3 + 1] =
      Math.cos(phi) * radius * 0.55
    seed[index * 3 + 2] =
      Math.sin(phi) * Math.sin(theta) * radius

    motion[index * 3] = 0.12 + Math.random() * 0.5
    motion[index * 3 + 1] = 0.25 + Math.random() * 1.35
    motion[index * 3 + 2] = 0.2 + Math.random() * 1.1

    shape[index * 3] = Math.random()
    shape[index * 3 + 1] = 0.35 + Math.random() * 1.9
    shape[index * 3 + 2] = Math.random()

    tint[index] = Math.random()
  }

  geometry.setAttribute(
    'aSeed',
    new THREE.BufferAttribute(seed, 3),
  )

  geometry.setAttribute(
    'aMotion',
    new THREE.BufferAttribute(motion, 3),
  )

  geometry.setAttribute(
    'aShape',
    new THREE.BufferAttribute(shape, 3),
  )

  geometry.setAttribute(
    'aTint',
    new THREE.BufferAttribute(tint, 1),
  )

  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(
      new Float32Array(count * 3),
      3,
    ),
  )

  geometry.boundingSphere = new THREE.Sphere(
    new THREE.Vector3(),
    80,
  )

  return geometry
}

function ParticleField({
  actIndex,
  quality,
  reducedMotion,
  env,
}: SceneNodeProps) {
  const count = PARTICLE_COUNT[quality]
  const pointsRef = useRef<THREE.Points>(null)
  const focusRef = useRef(1)
  const drawnRef = useRef(count)

  const gl = useThree((state) => state.gl)

  const geometry = useMemo(
    () => createParticleGeometry(count),
    [count],
  )

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uLevel: { value: 0 },
      uTreble: { value: 0 },
      uWarp: { value: 0 },
      uSpread: { value: 18 },
      uPixelRatio: { value: 1 },
      uKey: { value: paletteColor(actAt(0), 'key') },
      uEmber: { value: paletteColor(actAt(0), 'ember') },
    }),
    [],
  )

  const materialArgs = useMemo(
    () => [{
      ...FIELD_SHADER,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }] as [THREE.ShaderMaterialParameters],
    [uniforms],
  )

  useEffect(() => {
    return () => {
      geometry.dispose()
    }
  }, [geometry])

  useFrame((_, delta) => {
    const environment = env.current

    if (!environment) {
      return
    }

    const step = clampDelta(delta)
    const act = actAt(actIndex)

    focusRef.current = dampFocus(
      focusRef.current,
      act.focus.field,
      step,
    )

    if (!reducedMotion) {
      uniforms.uTime.value += step
    }

    uniforms.uKey.value.lerp(
      linearColor(act.palette.key),
      step * 1.4,
    )

    uniforms.uEmber.value.lerp(
      linearColor(act.palette.ember),
      step * 1.4,
    )

    uniforms.uLevel.value = THREE.MathUtils.damp(
      uniforms.uLevel.value,
      environment.level,
      6,
      step,
    )

    uniforms.uTreble.value = THREE.MathUtils.damp(
      uniforms.uTreble.value,
      environment.treble,
      16,
      step,
    )

    uniforms.uWarp.value = THREE.MathUtils.damp(
      uniforms.uWarp.value,
      environment.warp,
      5,
      step,
    )

    uniforms.uSpread.value = THREE.MathUtils.damp(
      uniforms.uSpread.value,
      15 + act.density * 7 - environment.warp * 6,
      3,
      step,
    )

    uniforms.uPixelRatio.value = Math.min(
      gl.getPixelRatio(),
      2,
    )

    if (pointsRef.current && !reducedMotion) {
      pointsRef.current.rotation.y +=
        step * (0.014 + environment.level * 0.02)
    }

    const targetCount = Math.max(
      160,
      Math.floor(
        count *
          act.density *
          (0.45 + focusRef.current * 0.55),
      ),
    )

    drawnRef.current = THREE.MathUtils.damp(
      drawnRef.current,
      targetCount,
      2.4,
      step,
    )

    geometry.setDrawRange(
      0,
      Math.floor(drawnRef.current),
    )
  })

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      frustumCulled={false}
    >
      <shaderMaterial args={materialArgs} />
    </points>
  )
}

/* ------------------------------------------------------------------ */
/* Portal                                                              */
/* ------------------------------------------------------------------ */

function Portal({
  actIndex,
  reducedMotion,
  env,
}: Pick<StageProps, 'actIndex' | 'reducedMotion' | 'env'>) {
  const meshRef = useRef<THREE.Mesh>(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWarp: { value: 0 },
      uKey: { value: paletteColor(actAt(0), 'key') },
      uEmber: { value: paletteColor(actAt(0), 'ember') },
    }),
    [],
  )

  const materialArgs = useMemo(
    () => [{
      ...PORTAL_SHADER,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }] as [THREE.ShaderMaterialParameters],
    [uniforms],
  )

  useFrame((state, delta) => {
    const environment = env.current

    if (!environment) {
      return
    }

    const step = clampDelta(delta)
    const act = actAt(actIndex)

    if (!reducedMotion) {
      uniforms.uTime.value += step
    }

    uniforms.uKey.value.lerp(
      linearColor(act.palette.key),
      step * 1.6,
    )

    uniforms.uEmber.value.lerp(
      linearColor(act.palette.ember),
      step * 1.6,
    )

    uniforms.uWarp.value = THREE.MathUtils.damp(
      uniforms.uWarp.value,
      environment.warp,
      5,
      step,
    )

    if (meshRef.current) {
      meshRef.current.quaternion.copy(
        state.camera.quaternion,
      )

      meshRef.current.scale.setScalar(
        6 + uniforms.uWarp.value * 9,
      )
    }
  })

  return (
    <mesh
      ref={meshRef}
      position={[0, 0, -3]}
      renderOrder={5}
    >
      <circleGeometry args={[1, 96]} />
      <shaderMaterial args={materialArgs} />
    </mesh>
  )
}

/* ------------------------------------------------------------------ */
/* Gradación de color                                                  */
/* ------------------------------------------------------------------ */

function Grade({
  actIndex,
  quality,
  env,
}: Pick<StageProps, 'actIndex' | 'quality' | 'env'>) {
  const gl = useThree((state) => state.gl)

  const gradeState = useRef({
    exposure: 1.1,
    bloom: 0.9,
    veil: 0.32,
  })

  useFrame((_, delta) => {
    const environment = env.current

    if (!environment) {
      return
    }

    const step = clampDelta(delta)
    const grade = actAt(actIndex).grade
    const warp = environment.warp

    const bloomCeiling =
      quality === 'low'
        ? 0.62
        : quality === 'medium'
          ? 0.95
          : 1.25

    gradeState.current.exposure = THREE.MathUtils.damp(
      gradeState.current.exposure,
      grade.exposure + warp * 0.22,
      1.6,
      step,
    )

    gradeState.current.bloom = THREE.MathUtils.damp(
      gradeState.current.bloom,
      Math.min(
        bloomCeiling,
        grade.bloom + environment.bass * 0.3,
      ),
      2.4,
      step,
    )

    gradeState.current.veil = THREE.MathUtils.damp(
      gradeState.current.veil,
      grade.veil,
      1.6,
      step,
    )

    gl.toneMappingExposure =
      gradeState.current.exposure
  })

  return null
}

/* ------------------------------------------------------------------ */
/* Escenario principal                                                 */
/* ------------------------------------------------------------------ */

export default function CinematicStage({
  actIndex,
  quality,
  reducedMotion,
  env,
  onQualityDecline,
}: StageProps) {
  const invalidate = useThree((state) => state.invalidate)
  const performance = useThree(
    (state) => state.performance,
  )

  const handleQualityDecline = useCallback(() => {
    performance.regress()
    onQualityDecline()
  }, [performance, onQualityDecline])

  useFrame(() => {
    const environment = env.current

    if (environment && environment.warp > 0.05) {
      performance.regress()
    }
  })

  useEffect(() => {
    if (!reducedMotion) {
      return
    }

    let frame = 0
    let animationFrame = 0

    const renderBurst = () => {
      invalidate()

      frame += 1

      if (frame < 90) {
        animationFrame = requestAnimationFrame(renderBurst)
      }
    }

    renderBurst()

    return () => {
      cancelAnimationFrame(animationFrame)
    }
  }, [actIndex, invalidate, reducedMotion])

  return (
    <>
      <PerformanceMonitor
        onDecline={handleQualityDecline}
        flipflops={3}
      />

      <AdaptiveDpr />
      <EnvSync env={env} />

      <CameraRig
        actIndex={actIndex}
        reducedMotion={reducedMotion}
        env={env}
      />

      <Nebula
        actIndex={actIndex}
        reducedMotion={reducedMotion}
        env={env}
      />

      <ReactiveSpectrum
        actIndex={actIndex}
        quality={quality}
        reducedMotion={reducedMotion}
        env={env}
      />

      <ParticleField
        actIndex={actIndex}
        quality={quality}
        reducedMotion={reducedMotion}
        env={env}
      />

      <AnamorphicStreak
        actIndex={actIndex}
        reducedMotion={reducedMotion}
        env={env}
      />

      <Grade
        actIndex={actIndex}
        quality={quality}
        env={env}
      />
    </>
  )
}

export const ACT_COUNT = CINEMATIC_ACTS.length
