/**
 * Data-seeded 3D hero — the geometry IS the owner's git history, so every
 * deployment of the engine is visually unique:
 *   particle count   ← total commits
 *   sphere radius    ← active days
 *   orbiting clusters← project count (+2)
 *   noise amplitude  ← breadth of the tech stack
 *   cluster sizes    ← yearly commit series
 * Structure is fully deterministic (hash-noise + PRNG seeded from the data);
 * only time-based motion is live. Dynamically imported on the home page only —
 * three must never reach the shared site bundle.
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Clock,
  Color,
  Group,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  WebGLRenderer,
} from "three";

export type HeroSeed = {
  commits: number;
  activeDays: number;
  projects: number;
  techCount: number;
  yearlySeries: number[];
};

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

/** Fold the seed numbers into one 32-bit integer (deterministic). */
function hashSeed(seed: HeroSeed): number {
  let h = 0x9e3779b9;
  const mix = (n: number) => {
    h ^= Math.imul(n | 0, 0x85ebca6b) + 0xe6546b64;
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  };
  mix(seed.commits);
  mix(seed.activeDays * 7);
  mix(seed.projects * 131);
  mix(seed.techCount * 2287);
  for (const v of seed.yearlySeries) mix(v);
  return h >>> 0;
}

/** mulberry32 — tiny deterministic PRNG. */
function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tiny lattice value-noise built on an integer hash of the seed. */
function makeNoise(seedInt: number): (x: number, y: number, z: number) => number {
  const hash = (x: number, y: number, z: number) => {
    let n = seedInt ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^
      Math.imul(z, 1442695041);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const u = smooth(x - xi), v = smooth(y - yi), w = smooth(z - zi);
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const c000 = hash(xi, yi, zi), c100 = hash(xi + 1, yi, zi);
    const c010 = hash(xi, yi + 1, zi), c110 = hash(xi + 1, yi + 1, zi);
    const c001 = hash(xi, yi, zi + 1), c101 = hash(xi + 1, yi, zi + 1);
    const c011 = hash(xi, yi + 1, zi + 1), c111 = hash(xi + 1, yi + 1, zi + 1);
    return lerp(
      lerp(lerp(c000, c100, u), lerp(c010, c110, u), v),
      lerp(lerp(c001, c101, u), lerp(c011, c111, u), v),
      w
    );
  };
}

/** Theme viz ramp endpoints + accent (mirrors theme.ts — buyer surface). */
function readThemeColors(): { low: Color; high: Color; bright: Color } {
  const css = getComputedStyle(document.documentElement);
  const low = css.getPropertyValue("--viz-1").trim() || "#2b3a5c";
  const high = css.getPropertyValue("--accent").trim() || "#7c9aff";
  const bright = new Color(high).lerp(new Color("#ffffff"), 0.55);
  return { low: new Color(low), high: new Color(high), bright };
}

interface Cloud {
  positions: Float32Array;
  colors: Float32Array;
}

/** Fibonacci-sphere point cloud, radially displaced by hash-noise. */
function buildCloud(
  count: number,
  radius: number,
  noiseAmp: number,
  noise: (x: number, y: number, z: number) => number,
  rand: () => number,
  palette: { low: Color; high: Color; bright: Color },
  noiseOffset: number
): Cloud {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const tmp = new Color();
  let minR = Infinity;
  let maxR = -Infinity;
  const radii = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const y = 1 - 2 * t;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const th = golden * i;
    const dx = Math.cos(th) * ring;
    const dz = Math.sin(th) * ring;
    const n = noise(
      dx * 2.4 + noiseOffset,
      y * 2.4 + noiseOffset,
      dz * 2.4 + noiseOffset
    );
    const r = radius * (1 + (n - 0.5) * 2 * noiseAmp);
    radii[i] = r;
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
    positions[i * 3] = dx * r;
    positions[i * 3 + 1] = y * r;
    positions[i * 3 + 2] = dz * r;
  }

  const span = Math.max(maxR - minR, 1e-6);
  for (let i = 0; i < count; i++) {
    if (rand() < 0.035) {
      tmp.copy(palette.bright);
    } else {
      tmp.copy(palette.low).lerp(palette.high, (radii[i] - minR) / span);
    }
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  return { positions, colors };
}

/**
 * Boot the hero constellation onto an existing <canvas>.
 * Returns a dispose function (call on astro:before-swap).
 */
export function initHero(canvas: HTMLCanvasElement, seed: HeroSeed): () => void {
  const noop = () => {};
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: "low-power",
    });
  } catch {
    return noop; // no WebGL — the CSS poster simply stays
  }

  const mobile = window.innerWidth < 768;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));

  /* ---------- structure derived from the seed ---------- */
  const seedInt = hashSeed(seed);
  const rand = mulberry32(seedInt);
  const noise = makeNoise(seedInt);
  const palette = readThemeColors();

  let particleCount = Math.round(clamp(800 + seed.commits * 4, 1000, 6000));
  if (mobile) particleCount = Math.round(particleCount / 2);
  const baseRadius = 2.1 + (clamp(seed.activeDays, 0, 365) / 365) * 1.1;
  const clusterCount = Math.round(clamp(seed.projects + 2, 2, 9));
  const noiseAmp = 0.16 + (clamp(seed.techCount, 0, 40) / 40) * 0.5;
  const series = seed.yearlySeries.length > 0 ? seed.yearlySeries : [1];
  const maxSeries = Math.max(...series, 1);

  const scene = new Scene();
  const camera = new PerspectiveCamera(55, 1, 0.1, 60);
  camera.position.set(0, 0, baseRadius * 2.7);

  const root = new Group();
  scene.add(root);

  const disposables: Array<{ dispose: () => void }> = [];

  const makePoints = (cloud: Cloud, size: number) => {
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(cloud.positions, 3));
    geo.setAttribute("color", new BufferAttribute(cloud.colors, 3));
    const mat = new PointsMaterial({
      size,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    disposables.push(geo, mat);
    return new Points(geo, mat);
  };

  /* main constellation (~72% of the budget) */
  const mainCount = Math.round(particleCount * 0.72);
  const mainCloud = buildCloud(mainCount, baseRadius, noiseAmp, noise, rand, palette, 7.31);
  const mainPoints = makePoints(mainCloud, 0.045);
  root.add(mainPoints);

  // per-point breathing setup (deterministic phases)
  const basePositions = mainCloud.positions.slice();
  const phases = new Float32Array(mainCount);
  for (let i = 0; i < mainCount; i++) phases[i] = rand() * Math.PI * 2;
  const mainPosAttr = mainPoints.geometry.getAttribute("position") as BufferAttribute;

  /* secondary orbiting clusters — one per project (+2), sized by yearly activity */
  const clusterBudget = particleCount - mainCount;
  const pivots: Array<{ group: Group; speed: number; bobPhase: number }> = [];
  const perCluster = Math.max(24, Math.floor(clusterBudget / clusterCount));
  for (let c = 0; c < clusterCount; c++) {
    const weight = (series[c % series.length] ?? 1) / maxSeries;
    const cRadius = 0.22 + weight * 0.5;
    const cloud = buildCloud(
      perCluster,
      cRadius,
      noiseAmp * 0.8,
      noise,
      rand,
      palette,
      13.7 + c * 5.3
    );
    const pts = makePoints(cloud, 0.035);
    const holder = new Group(); // offset from the pivot axis
    holder.add(pts);
    const orbit = baseRadius * (1.3 + rand() * 0.55);
    const incline = (rand() - 0.5) * 1.2;
    holder.position.set(orbit, Math.sin(incline) * baseRadius * 0.5, 0);
    const pivot = new Group();
    pivot.rotation.y = rand() * Math.PI * 2;
    pivot.rotation.z = (rand() - 0.5) * 0.35;
    pivot.add(holder);
    root.add(pivot);
    pivots.push({ group: pivot, speed: 0.05 + rand() * 0.09, bobPhase: rand() * Math.PI * 2 });
  }

  /* ---------- live motion (frame-rate independent) ---------- */
  const clock = new Clock();
  let elapsed = 0;
  let mouseX = 0;
  let mouseY = 0;

  const onPointerMove = (e: PointerEvent) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  window.addEventListener("pointermove", onPointerMove, { passive: true });

  const resize = () => {
    const w = canvas.clientWidth || canvas.parentElement?.clientWidth || 1;
    const h = canvas.clientHeight || canvas.parentElement?.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };
  resize();
  window.addEventListener("resize", resize);

  let rafId = 0;
  let running = false;

  const frame = () => {
    rafId = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;

    root.rotation.y += 0.02 * dt; // slow global spin
    for (const p of pivots) {
      p.group.rotation.y += p.speed * dt;
      p.group.position.y = Math.sin(elapsed * 0.4 + p.bobPhase) * 0.08;
    }

    // gentle per-point breathing on the main constellation
    const arr = mainPosAttr.array as Float32Array;
    for (let i = 0; i < mainCount; i++) {
      const s = 1 + Math.sin(elapsed * 0.8 + phases[i]) * 0.02;
      arr[i * 3] = basePositions[i * 3] * s;
      arr[i * 3 + 1] = basePositions[i * 3 + 1] * s;
      arr[i * 3 + 2] = basePositions[i * 3 + 2] * s;
    }
    mainPosAttr.needsUpdate = true;

    // mouse parallax (lerped, ±0.3)
    const k = Math.min(1, dt * 3);
    camera.position.x += (mouseX * 0.3 - camera.position.x) * k;
    camera.position.y += (-mouseY * 0.3 - camera.position.y) * k;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  };

  const start = () => {
    if (running) return;
    running = true;
    clock.getDelta(); // swallow the pause gap
    rafId = requestAnimationFrame(frame);
  };
  const stop = () => {
    if (!running) return;
    running = false;
    cancelAnimationFrame(rafId);
  };

  // pause when the hero scrolls out of view or the tab is hidden
  const io = new IntersectionObserver(
    ([entry]) => (entry?.isIntersecting ? start() : stop()),
    { threshold: 0 }
  );
  io.observe(canvas);
  const onVisibility = () => {
    if (document.hidden) stop();
    else if (canvas.isConnected) start();
  };
  document.addEventListener("visibilitychange", onVisibility);

  start();

  return () => {
    stop();
    io.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("resize", resize);
    for (const d of disposables) d.dispose();
    renderer.dispose();
  };
}
