"use client";

/**
 * FlowFieldScene — full-bleed hero flow field.
 *
 * Streamlines advected through a curl-style noise field (ImprovedNoise).
 * Each thread is a continuous vertex-colored line (Line2) that fades into
 * the page background at the tail — no point sprites or dotted trails.
 *
 * Respects prefers-reduced-motion (renders a single static frame).
 * Import from "@xauconnect/ui/three" with next/dynamic({ ssr: false }).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ImprovedNoise } from "three/examples/jsm/math/ImprovedNoise.js";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

// ─── Palette ─────────────────────────────────────────────────────────────────

const GOLD = new THREE.Color("#FFB300");
const GOLD_DEEP = new THREE.Color("#FF8A00");
const PINK = new THREE.Color("#FF69B4");
const PINK_SOFT = new THREE.Color("#FFB6C1");
/** Page background — trail tails dissolve into this. */
const BG = new THREE.Color("#FAF7F2");

// ─── Flow field ──────────────────────────────────────────────────────────────

const noise = new ImprovedNoise();

/** Bounds of the flow volume (x, y, z half-extents) — wide/tall for full-bleed coverage. */
const BOUNDS = new THREE.Vector3(14, 7.2, 3.4);

function fieldDirection(p: THREE.Vector3, t: number, out: THREE.Vector3): THREE.Vector3 {
  const s = 0.16;
  const a = noise.noise(p.x * s, p.y * s, t * 0.06) * Math.PI * 3.2;
  const b = noise.noise(p.y * s + 31.7, p.z * s + 11.3, t * 0.05) * Math.PI * 2.1;
  out.set(
    Math.cos(a) * 0.62 + 0.55,
    Math.sin(a) * 0.55 + Math.sin(b) * 0.18,
    Math.cos(b) * 0.32,
  );
  return out.normalize();
}

function respawn(p: THREE.Vector3): void {
  p.set(
    -BOUNDS.x - Math.random() * 3,
    (Math.random() * 2 - 1) * BOUNDS.y,
    (Math.random() * 2 - 1) * BOUNDS.z,
  );
}

// ─── Streamline threads ──────────────────────────────────────────────────────

interface RibbonState {
  head: THREE.Vector3;
  speed: number;
  color: THREE.Color;
}

const TRAIL = 72;

function Ribbon({ index, frozen }: { index: number; frozen: boolean }) {
  const dir = useMemo(() => new THREE.Vector3(), []);
  const geometryRef = useRef<LineGeometry>(null);
  const materialRef = useRef<LineMaterial>(null);

  const state = useMemo<RibbonState>(() => {
    const head = new THREE.Vector3(
      (Math.random() * 2 - 1) * BOUNDS.x,
      (Math.random() * 2 - 1) * BOUNDS.y,
      (Math.random() * 2 - 1) * BOUNDS.z,
    );
    const golden = index % 3 !== 2;
    const tint = golden
      ? GOLD.clone().lerp(GOLD_DEEP, Math.random())
      : PINK.clone().lerp(PINK_SOFT, Math.random() * 0.6);
    return { head, speed: 1.5 + Math.random() * 1.6, color: tint };
  }, [index]);

  const positionsRef = useRef(new Float32Array(TRAIL * 3));

  const line = useMemo(() => {
    const positions = positionsRef.current;
    const colors = new Float32Array(TRAIL * 3);
    for (let i = 0; i < TRAIL; i++) {
      positions[i * 3] = state.head.x;
      positions[i * 3 + 1] = state.head.y;
      positions[i * 3 + 2] = state.head.z;
      const fade = Math.pow(i / (TRAIL - 1), 1.35);
      const c = state.color.clone().lerp(BG, fade);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new LineGeometry();
    geo.setPositions(positions);
    geo.setColors(colors);

    const mat = new LineMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.82,
      linewidth: 2.2,
      depthWrite: false,
      resolution: new THREE.Vector2(1, 1),
    });

    const thread = new Line2(geo, mat);
    thread.frustumCulled = false;
    geometryRef.current = geo;
    materialRef.current = mat;
    return thread;
  }, [state]);

  useFrame((rootState, delta) => {
    if (frozen || !geometryRef.current) return;
    const dt = Math.min(delta, 0.05);
    const t = rootState.clock.elapsedTime;

    if (materialRef.current) {
      materialRef.current.resolution.set(rootState.size.width, rootState.size.height);
    }

    const arr = positionsRef.current;
    arr.copyWithin(3, 0, (TRAIL - 1) * 3);

    fieldDirection(state.head, t, dir);
    state.head.addScaledVector(dir, dt * state.speed);

    if (
      state.head.x > BOUNDS.x + 2.5 ||
      Math.abs(state.head.y) > BOUNDS.y + 1.8 ||
      Math.abs(state.head.z) > BOUNDS.z + 1.8
    ) {
      respawn(state.head);
      for (let i = 0; i < TRAIL; i++) {
        arr[i * 3] = state.head.x;
        arr[i * 3 + 1] = state.head.y;
        arr[i * 3 + 2] = state.head.z;
      }
    } else {
      arr[0] = state.head.x;
      arr[1] = state.head.y;
      arr[2] = state.head.z;
    }

    geometryRef.current.setPositions(arr);
  });

  return <primitive object={line} />;
}

// ─── Pointer parallax rig ────────────────────────────────────────────────────

function ParallaxRig({ children, frozen }: { children: React.ReactNode; frozen: boolean }) {
  const group = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!group.current || frozen) return;
    const t = state.clock.elapsedTime;
    const targetY = state.pointer.x * 0.18 + Math.sin(t * 0.12) * 0.04;
    const targetX = -state.pointer.y * 0.12 + Math.cos(t * 0.1) * 0.03;
    group.current.rotation.y += (targetY - group.current.rotation.y) * Math.min(delta * 2.5, 1);
    group.current.rotation.x += (targetX - group.current.rotation.x) * Math.min(delta * 2.5, 1);
  });

  return <group ref={group}>{children}</group>;
}

// ─── Scene ───────────────────────────────────────────────────────────────────

export interface FlowFieldSceneProps {
  className?: string;
  /** Streamline count (lower on small screens for perf). */
  ribbonCount?: number;
}

export function FlowFieldScene({ className, ribbonCount = 48 }: FlowFieldSceneProps) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [smallScreen, setSmallScreen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);

    const sq = window.matchMedia("(max-width: 640px)");
    setSmallScreen(sq.matches);
    const onResize = (e: MediaQueryListEvent) => setSmallScreen(e.matches);
    sq.addEventListener("change", onResize);

    return () => {
      mq.removeEventListener("change", onChange);
      sq.removeEventListener("change", onResize);
    };
  }, []);

  const effectiveRibbons = smallScreen ? Math.round(ribbonCount * 0.35) : ribbonCount;

  const ribbons = useMemo(
    () => Array.from({ length: effectiveRibbons }, (_, i) => i),
    [effectiveRibbons],
  );

  return (
    <div className={className} aria-hidden>
      <Canvas
        camera={{ position: [0, 0, 10.5], fov: 52 }}
        dpr={smallScreen ? [1, 1.15] : [1, 1.8]}
        gl={{ antialias: !smallScreen, alpha: true }}
        frameloop={reducedMotion ? "demand" : "always"}
      >
        <ParallaxRig frozen={reducedMotion}>
          {ribbons.map((i) => (
            <Ribbon key={i} index={i} frozen={reducedMotion} />
          ))}
        </ParallaxRig>
      </Canvas>
    </div>
  );
}
