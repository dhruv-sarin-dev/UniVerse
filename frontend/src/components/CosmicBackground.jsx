import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/*  ───────────────────────────────────────────────────────────────────
    SUPERNOVA COSMIC BACKGROUND  –  Awwwards-grade generative galaxy
    (Optimized: no post-processing, reduced particle count & sizes)
    ─────────────────────────────────────────────────────────────────── */

// ── Seeded PRNG (deterministic, lint-safe) ──
function mulberry32(s) {
  return () => {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ═══════════════════════  SHADERS  ═══════════════════════

// ── Stars ──
const starVert = `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aScale;
  attribute float aPhase;
  attribute vec3  aColor;
  varying vec3  vColor;
  varying float vAlpha;

  void main() {
    vec4 mp = modelMatrix * vec4(position, 1.0);

    // gentle orbital drift
    float a = uTime * 0.04 + aPhase * 6.2831;
    mp.x += sin(a) * 0.4;
    mp.z += cos(a) * 0.4;
    mp.y += sin(uTime * 0.08 + aPhase * 12.566) * 0.2;

    vec4 vp = viewMatrix * mp;
    gl_Position = projectionMatrix * vp;

    float att = 1.0 / -vp.z;
    float twinkle = 0.5 + 0.5 * sin(uTime * (2.0 + aPhase * 4.0) + aPhase * 30.0);
    gl_PointSize = aScale * uPixelRatio * 160.0 * att * twinkle;
    gl_PointSize = clamp(gl_PointSize, 0.5, 64.0);

    vColor = aColor;
    vAlpha = twinkle * (0.5 + 0.5 * smoothstep(0.0, 0.25, aScale));
  }
`;

// ── Stars fragment: boosted alpha to compensate for removed Bloom ──
const starFrag = `
  varying vec3  vColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;

    float core  = 1.0 - d * 2.0;
    core = pow(core, 1.8);

    float halo  = exp(-d * 5.0) * 0.8;           // was 0.6 — boosted
    float spike = exp(-d * 12.0) * 0.5;           // was 0.3 — boosted

    vec3  col = vColor * (core + halo + spike);
    float alpha = (core + halo + spike) * vAlpha;

    gl_FragColor = vec4(col, alpha);
  }
`;

// ── Nebula / gas clouds ──
const nebVert = `
  uniform float uTime;
  attribute float aScale;
  attribute float aPhase;
  attribute vec3  aColor;
  varying vec3  vColor;
  varying float vAlpha;

  void main() {
    vec4 mp = modelMatrix * vec4(position, 1.0);
    mp.x += sin(uTime * 0.015 + aPhase * 6.28) * 0.8;
    mp.y += cos(uTime * 0.012 + aPhase * 3.14) * 0.5;
    mp.z += sin(uTime * 0.01  + aPhase * 4.71) * 0.5;

    vec4 vp = viewMatrix * mp;
    gl_Position = projectionMatrix * vp;

    float att = 1.0 / -vp.z;
    gl_PointSize = aScale * 900.0 * att;
    gl_PointSize = clamp(gl_PointSize, 2.0, 175.0);   // was 350 — halved

    vColor = aColor;
    // Boosted alpha to compensate for removed Bloom (was 0.15)
    vAlpha = 0.22 * (0.8 + 0.2 * sin(uTime * 0.2 + aPhase * 10.0));
  }
`;

const nebFrag = `
  varying vec3  vColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;

    float s = 1.0 - d * 2.0;
    s = pow(s, 3.0);   // softer falloff for cloud-like look

    gl_FragColor = vec4(vColor * 1.3, s * vAlpha);
  }
`;

// ── Core glow (bright galactic center) ──
const coreVert = `
  uniform float uTime;
  attribute float aScale;
  attribute float aPhase;
  attribute vec3  aColor;
  varying vec3  vColor;
  varying float vAlpha;

  void main() {
    vec4 mp = modelMatrix * vec4(position, 1.0);
    mp.x += sin(uTime * 0.03 + aPhase * 6.28) * 0.2;
    mp.y += cos(uTime * 0.02 + aPhase * 3.14) * 0.15;

    vec4 vp = viewMatrix * mp;
    gl_Position = projectionMatrix * vp;

    float att = 1.0 / -vp.z;
    gl_PointSize = aScale * 1200.0 * att;
    gl_PointSize = clamp(gl_PointSize, 4.0, 250.0);   // was 500 — halved

    vColor = aColor;
    vAlpha = 0.08 + 0.04 * sin(uTime * 0.15 + aPhase * 5.0);
  }
`;

// ── Core fragment: boosted color multiplier to compensate for removed Bloom ──
const coreFrag = `
  varying vec3  vColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;

    float s = 1.0 - d * 2.0;
    s = pow(s, 4.0);

    gl_FragColor = vec4(vColor * 2.0, s * vAlpha);   // was 1.5 — boosted
  }
`;

// ═════════════════  DATA GENERATORS  ═════════════════

const PALETTE = [
  [0.00, 0.94, 1.00],  // cyan #00F0FF
  [0.45, 0.00, 1.00],  // purple #7000FF
  [0.00, 0.94, 0.63],  // teal #00F0A0
  [1.00, 0.00, 0.43],  // magenta #FF006E
  [0.55, 0.55, 1.00],  // lavender
  [1.00, 0.85, 0.30],  // warm gold
  [1.00, 1.00, 1.00],  // white
];

// ── Stars: 2500 particles in a multi-arm spiral (was 5000) ──
function genStars() {
  const N = 2500;
  const rng = mulberry32(42);
  const pos = new Float32Array(N * 3);
  const scl = new Float32Array(N);
  const pha = new Float32Array(N);
  const col = new Float32Array(N * 3);

  for (let i = 0; i < N; i++) {
    const i3 = i * 3;
    const arm = Math.floor(rng() * 4);           // 4 spiral arms
    const armA = (arm / 4) * Math.PI * 2;
    const dist = rng() * 14 + 0.5;
    const spiral = armA + dist * 0.55;
    const scatter = (rng() - 0.5) * (1.8 + dist * 0.25);

    pos[i3]     = Math.cos(spiral) * dist + scatter;
    pos[i3 + 1] = (rng() - 0.5) * 2.5 * Math.exp(-dist * 0.12);
    pos[i3 + 2] = Math.sin(spiral) * dist + scatter;

    // More variety in star sizes — 8% chance of a big bright star
    scl[i] = rng() < 0.08
      ? rng() * 0.6 + 0.35
      : rng() * 0.18 + 0.03;

    pha[i] = rng();

    // More colorful mix: 50% white, 50% from palette
    const c = rng() < 0.5
      ? PALETTE[6]
      : PALETTE[Math.floor(rng() * 6)];
    col[i3]     = c[0];
    col[i3 + 1] = c[1];
    col[i3 + 2] = c[2];
  }
  return { pos, scl, pha, col, count: N };
}

// ── Nebula: 60 big soft clouds ──
function genNebula() {
  const N = 60;
  const rng = mulberry32(99);
  const nebPalette = [
    [0.45, 0.00, 1.00],  // deep purple
    [0.00, 0.60, 1.00],  // electric blue
    [1.00, 0.00, 0.43],  // hot pink
    [0.00, 0.94, 0.63],  // emerald
    [0.30, 0.00, 0.70],  // dark violet
    [0.00, 0.35, 0.80],  // deep ocean
  ];

  const pos = new Float32Array(N * 3);
  const scl = new Float32Array(N);
  const pha = new Float32Array(N);
  const col = new Float32Array(N * 3);

  for (let i = 0; i < N; i++) {
    const i3 = i * 3;
    // Cluster clouds near spiral arms
    const arm = Math.floor(rng() * 4);
    const armA = (arm / 4) * Math.PI * 2;
    const dist = rng() * 12 + 2;
    const spiral = armA + dist * 0.5;

    pos[i3]     = Math.cos(spiral) * dist + (rng() - 0.5) * 5;
    pos[i3 + 1] = (rng() - 0.5) * 4;
    pos[i3 + 2] = Math.sin(spiral) * dist + (rng() - 0.5) * 5;

    scl[i] = rng() * 4.0 + 2.0;
    pha[i] = rng();

    const c = nebPalette[Math.floor(rng() * nebPalette.length)];
    col[i3]     = c[0];
    col[i3 + 1] = c[1];
    col[i3 + 2] = c[2];
  }
  return { pos, scl, pha, col, count: N };
}

// ── Core glow: 8 very large soft orbs near center ──
function genCore() {
  const N = 8;
  const rng = mulberry32(77);
  const corePalette = [
    [0.45, 0.10, 1.00],
    [0.00, 0.70, 1.00],
    [0.80, 0.20, 1.00],
    [0.20, 0.00, 0.60],
  ];

  const pos = new Float32Array(N * 3);
  const scl = new Float32Array(N);
  const pha = new Float32Array(N);
  const col = new Float32Array(N * 3);

  for (let i = 0; i < N; i++) {
    const i3 = i * 3;
    pos[i3]     = (rng() - 0.5) * 4;
    pos[i3 + 1] = (rng() - 0.5) * 2;
    pos[i3 + 2] = (rng() - 0.5) * 4;
    scl[i] = rng() * 5.0 + 3.0;
    pha[i] = rng();

    const c = corePalette[Math.floor(rng() * corePalette.length)];
    col[i3]     = c[0];
    col[i3 + 1] = c[1];
    col[i3 + 2] = c[2];
  }
  return { pos, scl, pha, col, count: N };
}

// Pre-compute once
const STARS  = genStars();
const NEBULA = genNebula();
const CORE   = genCore();

// ═════════════════  COMPONENTS  ═════════════════

function ParticleLayer({ data, vert, frag, extraUniforms, rotSpeed }) {
  const ref = useRef();

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    ...extraUniforms,
  }), [extraUniforms]);

  useFrame((_s, delta) => {
    if (!ref.current) return;
    ref.current.material.uniforms.uTime.value += delta;
    ref.current.rotation.y += delta * (rotSpeed || 0.01);
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.pos, 3]} />
        <bufferAttribute attach="attributes-aScale"   args={[data.scl, 1]} />
        <bufferAttribute attach="attributes-aPhase"   args={[data.pha, 1]} />
        <bufferAttribute attach="attributes-aColor"    args={[data.col, 3]} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function CameraRig() {
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth  - 0.5) * 2;
      mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  useFrame((state, delta) => {
    const cam = state.camera;
    const sp = Math.min(delta * 2.5, 0.04);
    cam.position.x += (mouse.current.x * 2.0 - cam.position.x) * sp;
    cam.position.y += (-mouse.current.y * 1.0 + 2.5 - cam.position.y) * sp;
    cam.lookAt(0, 0, 0);
  });

  return null;
}

// ═══════════════  MAIN EXPORT  ═══════════════

export default function CosmicBackground() {
  return (
    <div
      className="fixed inset-0 z-0"
      style={{
        pointerEvents: 'none',
        /* CSS vignette replaces removed post-processing Vignette */
        boxShadow: 'inset 0 0 200px 80px rgba(0,0,0,0.85)',
      }}
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 2.5, 14], fov: 55, near: 0.1, far: 120 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent', pointerEvents: 'none' }}
      >
        {/* Core glow orbs — deep center light */}
        <ParticleLayer data={CORE}   vert={coreVert} frag={coreFrag} rotSpeed={0.005} />
        {/* Nebula gas clouds — visible color washes */}
        <ParticleLayer data={NEBULA} vert={nebVert}  frag={nebFrag}  rotSpeed={0.007} />
        {/* Star field — twinkling points */}
        <ParticleLayer data={STARS}  vert={starVert} frag={starFrag} rotSpeed={0.012} />
        {/* Camera parallax */}
        <CameraRig />
        {/* Post-processing REMOVED — Bloom & Vignette replaced by shader tweaks + CSS */}
      </Canvas>
    </div>
  );
}
