/**
 * Shader de la experiencia cinemática.
 *
 * Convención: son ShaderMaterial de three (GLSL 1). NO se declaran `position`,
 * `normal`, `uv`, `modelViewMatrix`, `projectionMatrix` ni `cameraPosition`,
 * porque three los inyecta; solo se declaran los atributos y uniforms propios.
 */

/** Ruido simplex 3D + fbm, usado por núcleo, nebula y partículas. */
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

float fbm(vec3 p){
  float value = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amp * snoise(p);
    p *= 2.03;
    amp *= 0.5;
  }
  return value;
}
`

export const NEBULA_SHADER = {
  vertexShader: /* glsl */ `
    varying vec3 vWorld;
    void main() {
      vWorld = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform float uTime;
    uniform float uWarp;
    uniform float uLevel;
    uniform vec3 uFog;
    uniform vec3 uKey;
    uniform vec3 uEmber;
    varying vec3 vWorld;
    ${NOISE}
    float hash(vec3 p){
      p = fract(p * 0.3183099 + 0.1);
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }
    vec3 hash3(vec3 p){
      return vec3(hash(p), hash(p + 19.19), hash(p + 37.77));
    }
    // Estrella suave: posición dentro de la celda + caída radial, sin pixel duro.
    float starfield(vec3 dir, float density, float scale){
      vec3 sc = dir * scale;
      vec3 id = floor(sc);
      vec3 fr = fract(sc) - 0.5;
      float present = smoothstep(1.0 - density, 1.0, hash(id));
      vec3 off = (hash3(id) - 0.5) * 0.66;
      float d = length(fr - off);
      float core = smoothstep(0.17, 0.0, d);
      float halo = smoothstep(0.42, 0.0, d) * 0.16;
      return present * (core + halo);
    }
    void main() {
      vec3 dir = normalize(vWorld);
      float drift = uTime * 0.014;

      // Nubosidad de dos octavas: masa lenta + hilos finos por encima.
      vec3 q = dir * 1.55 + vec3(drift, drift * 0.6, -drift * 0.4);
      float mass = fbm(q + fbm(q * 1.7 + uTime * 0.008) * 0.42);
      float clouds = smoothstep(-0.30, 0.86, mass);
      float wisps = smoothstep(0.28, 0.94, fbm(q * 4.1 - vec3(drift * 2.0)));

      // Banda tipo vía láctea: plano inclinado que concentra estrellas.
      float band = 1.0 - smoothstep(0.0, 0.38, abs(dot(dir, normalize(vec3(0.28, 0.72, -0.55)))));
      band = pow(band, 2.6);

      // Dos capas de estrellas, escasas y redondas, con titilación lenta.
      float twinkle = 0.6 + 0.4 * sin(uTime * 1.15 + hash(floor(dir * 260.0) + 3.7) * 40.0);
      float bright = starfield(dir, 0.030 + band * 0.030, 260.0) * twinkle;
      float faint = starfield(dir, 0.055 + band * 0.045, 640.0) * (0.55 + 0.45 * sin(uTime * 0.8 + dir.x * 9.0));

      // Gravedad cenital: arriba casi negro, abajo respira hacia la niebla.
      float sky = smoothstep(-0.75, 0.9, dir.y);
      vec3 col = mix(uFog * 1.15, uFog * 0.30, sky);

      col += uKey * pow(clouds, 2.3) * (0.11 + uLevel * 0.20);
      col += uKey * wisps * band * 0.07;
      col += uEmber * pow(max(0.0, clouds - 0.68), 1.9) * 0.16;
      col += mix(uKey, uEmber, 0.35) * band * (0.035 + uLevel * 0.045);
      col += vec3(0.86, 0.93, 1.0) * bright * 1.35;
      col += vec3(0.68, 0.82, 0.98) * faint * 0.5;

      // El warp estira la nebula hacia el centro del encuadre.
      float pull = uWarp * 0.55;
      col = mix(col, uKey * 0.9, pull * pow(max(0.0, 1.0 - abs(dir.z)), 3.0));

      gl_FragColor = vec4(col, 1.0);
    }
  `,
}

export const CORE_SHADER = {
  vertexShader: /* glsl */ `
    uniform float uTime;
    uniform float uLevel;
    uniform float uBass;
    uniform float uWarp;
    varying vec3 vNormalW;
    varying vec3 vPosW;
    varying float vNoise;
    ${NOISE}
    void main() {
      float n = fbm(normalize(position) * 2.1 + vec3(0.0, uTime * 0.16, 0.0));
      vNoise = n;
      vec3 displaced = position + normal * (n * 0.26 + uLevel * 0.20 + uBass * 0.55 + uWarp * 0.9);
      vec4 world = modelMatrix * vec4(displaced, 1.0);
      vPosW = world.xyz;
      vNormalW = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * world;
    }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform float uTime;
    uniform float uLevel;
    uniform vec3 uKey;
    uniform vec3 uCore;
    uniform vec3 uWarm;
    varying vec3 vNormalW;
    varying vec3 vPosW;
    varying float vNoise;
    void main() {
      vec3 viewDir = normalize(cameraPosition - vPosW);
      float ndv = max(dot(viewDir, normalize(vNormalW)), 0.0);
      // Filo fino tipo vidrio: sólo el borde extremo brilla.
      float rim = pow(1.0 - ndv, 3.6);
      // Interferencia: dos bandas de distinta frecuencia, apenas legibles.
      float fine = sin((vPosW.y * 34.0) + vNoise * 6.0 - uTime * 0.9) * 0.5 + 0.5;
      float broad = sin((vPosW.y * 5.0) - uTime * 0.35) * 0.5 + 0.5;
      float bands = pow(fine, 3.0) * 0.35 + broad * 0.14;

      // Iridiscencia: el frío del key se calienta hacia el filo inferior.
      vec3 irides = mix(uKey, uWarm, smoothstep(-1.4, 1.4, vPosW.y) * 0.55);

      vec3 col = uCore * (0.35 + ndv * 0.4);
      col += irides * rim * (0.9 + uLevel * 1.5);
      col += uKey * bands * (0.16 + uLevel * 0.22);
      col += vec3(0.03, 0.08, 0.11) * (vNoise * 0.5 + 0.5);

      float alpha = 0.16 + rim * 0.82 + bands * 0.10;
      gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
    }
  `,
}

export const RING_SHADER = {
  vertexShader: /* glsl */ `
    uniform float uTime;
    uniform float uLevel;
    varying vec2 vCoord;
    varying vec3 vNormalW;
    varying vec3 vPosW;
    void main() {
      vCoord = uv;
      vec4 world = modelMatrix * vec4(position, 1.0);
      vPosW = world.xyz;
      vNormalW = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * world;
    }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform float uTime;
    uniform float uLevel;
    uniform float uBass;
    uniform float uSpeed;
    uniform vec3 uKey;
    uniform vec3 uEmber;
    varying vec2 vCoord;
    varying vec3 vNormalW;
    varying vec3 vPosW;
    void main() {
      float sweep = fract(vCoord.x * 3.0 - uTime * uSpeed);
      float pulse = pow(1.0 - abs(sweep * 2.0 - 1.0), 6.0);
      vec3 viewDir = normalize(cameraPosition - vPosW);
      float fres = pow(1.0 - max(dot(viewDir, normalize(vNormalW)), 0.0), 1.6);
      vec3 col = mix(uKey, uEmber, 0.35 + 0.35 * sin(vCoord.x * 12.0 + uTime * 0.6));
      col *= 0.14 + pulse * (0.95 + uLevel * 1.25 + uBass * 1.35) + fres * 0.5;
      float alpha = clamp(0.12 + pulse * 0.78 + fres * 0.34, 0.0, 1.0);
      gl_FragColor = vec4(col, alpha);
    }
  `,
}

/**
 * Campo de partículas: todos los puntos en una sola draw call.
 * Atributos por instancia: aSeed (posición base), aMotion (velocidad/orbita),
 * aShape (tamaños y fase) y aTint (mezcla de paleta).
 */
export const FIELD_SHADER = {
  vertexShader: /* glsl */ `
    uniform float uTime;
    uniform float uLevel;
    uniform float uTreble;
    uniform float uWarp;
    uniform float uSpread;
    uniform float uPixelRatio;
    attribute vec3 aSeed;
    attribute vec3 aMotion;
    attribute vec3 aShape;
    attribute float aTint;
    varying float vTint;
    varying float vFade;
    varying float vSpark;
    void main() {
      vec3 p = aSeed * uSpread;
      float t = uTime * aMotion.x;
      // Deriva orbital + ondulación tipo curl, sin texturas ni bucles largos.
      p.x += sin(t + aShape.z * 6.2831) * aMotion.y;
      p.y += cos(t * 0.8 + aShape.z * 4.1) * aMotion.z + sin(uTime * 0.25 + p.x * 0.1) * 0.3;
      p.z += cos(t * 0.6 + aShape.z * 2.3) * aMotion.y;

      // El warp colapsa el campo hacia el origen: transición de acto.
      p = mix(p, normalize(p + 0.0001) * (0.4 + 0.2 * aShape.x), uWarp * 0.92);
      p *= 1.0 + uLevel * 0.12;

      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      float dist = -mv.z;
      vFade = smoothstep(0.0, 3.0, dist) * (1.0 - smoothstep(26.0, 48.0, dist));
      vTint = aTint;
      // Los agudos hacen chispear el campo, con fase aleatoria por partícula.
      float spark = 0.5 + 0.5 * sin(uTime * 5.2 + aShape.x * 34.0);
      vSpark = clamp(1.0 + uTreble * spark * 1.9, 1.0, 2.6);
      gl_PointSize = aShape.y * uPixelRatio * (14.0 / max(dist, 1.0)) * (1.0 + uLevel * 0.5 + uWarp * 1.4) * vSpark;
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform vec3 uKey;
    uniform vec3 uEmber;
    uniform float uLevel;
    varying float vTint;
    varying float vFade;
    varying float vSpark;
    void main() {
      vec2 uvp = gl_PointCoord - 0.5;
      float d = length(uvp);
      if (d > 0.5) discard;
      // Borde suave: sin halo duro, la partícula se desvanece en cuadrática.
      float glow = pow(1.0 - d * 2.0, 2.6);
      vec3 col = mix(uKey, uEmber, smoothstep(0.5, 1.0, vTint));
      col += vec3(0.10, 0.16, 0.20) * uLevel;
      float energy = (0.42 + glow * 0.9) * vSpark;
      gl_FragColor = vec4(col * energy, clamp(glow * vFade * 0.62 * vSpark, 0.0, 1.0));
    }
  `,
}

/** Disco del portal: vórtice aditivo que aparece durante el warp. */
export const PORTAL_SHADER = {
  vertexShader: /* glsl */ `
    varying vec2 vCoord;
    void main() {
      vCoord = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform float uTime;
    uniform float uWarp;
    uniform vec3 uKey;
    uniform vec3 uEmber;
    varying vec2 vCoord;
    void main() {
      vec2 c = vCoord - 0.5;
      float r = length(c) * 2.0;
      float ang = atan(c.y, c.x);
      float spiral = sin(ang * 5.0 + r * 11.0 - uTime * 2.4);
      float arms = pow(max(0.0, spiral), 3.0);
      float disc = smoothstep(1.0, 0.15, r) * smoothstep(0.02, 0.22, r);
      vec3 col = mix(uKey, uEmber, 0.5 + 0.5 * sin(ang * 2.0 + uTime));
      float a = disc * (0.10 + arms * 0.6) * uWarp;
      gl_FragColor = vec4(col * (0.5 + arms), a);
    }
  `,
}

/**
 * Destello anamórfico: la franja horizontal que las ópticas de cine añaden a
 * las luces puntuales. Es un plano ancho y bajísimo, sin geometría real.
 */
export const STREAK_SHADER = {
  vertexShader: /* glsl */ `
    varying vec2 vCoord;
    void main() {
      vCoord = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform float uTime;
    uniform float uLevel;
    uniform float uBass;
    uniform float uOpacity;
    uniform vec3 uKey;
    uniform vec3 uWarm;
    varying vec2 vCoord;
    void main() {
      vec2 c = vCoord - 0.5;
      // Perfil horizontal: ojo de buey en el centro, colas suaves a los lados.
      float x = abs(c.x) * 2.0;
      float tails = pow(max(0.0, 1.0 - x), 2.6);
      // Perfil vertical: gaussiana muy apretada, más una brea ancha y tenue.
      float core = exp(-abs(c.y) * 260.0);
      float flare = exp(-c.y * c.y * 34.0);
      float shimmer = 0.86 + 0.14 * sin(uTime * 1.7 + c.x * 22.0);

      vec3 col = mix(uKey, uWarm, 0.25 + 0.45 * x);
      float energy = (core * 0.9 + flare * 0.34) * tails * shimmer;
      energy *= uOpacity * (0.55 + uLevel * 0.9 + uBass * 1.1);

      gl_FragColor = vec4(col * energy, clamp(energy, 0.0, 1.0));
    }
  `,
}

/** Arcos de armilla: filetes luminosos con un destello que los recorre. */
export const ARC_SHADER = {
  vertexShader: /* glsl */ `
    varying vec2 vCoord;
    varying vec3 vNormalW;
    varying vec3 vPosW;
    void main() {
      vCoord = uv;
      vec4 world = modelMatrix * vec4(position, 1.0);
      vPosW = world.xyz;
      vNormalW = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * world;
    }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform float uTime;
    uniform float uLevel;
    uniform float uSpeed;
    uniform float uPhase;
    uniform vec3 uKey;
    uniform vec3 uWarm;
    varying vec2 vCoord;
    varying vec3 vNormalW;
    varying vec3 vPosW;
    void main() {
      // Línea base constante: el lujo está en la continuidad, no en el brillo.
      float base = 0.30 + uLevel * 0.16;
      // Un único glint que da la vuelta, con cola asimétrica.
      float head = fract(vCoord.x - uTime * uSpeed + uPhase);
      float glint = pow(max(0.0, 1.0 - head * 7.0), 3.4);
      // Se apaga de frente y enciende de canto, como metal pulido.
      vec3 viewDir = normalize(cameraPosition - vPosW);
      float edge = pow(1.0 - max(dot(viewDir, normalize(vNormalW)), 0.0), 1.3);

      vec3 col = mix(uKey, uWarm, smoothstep(0.0, 1.0, vCoord.x));
      float energy = base * 0.5 + glint * 1.5 + edge * 0.22;
      float alpha = clamp(0.16 + glint * 0.7 + edge * 0.30, 0.0, 1.0);
      gl_FragColor = vec4(col * energy, alpha);
    }
  `,
}
