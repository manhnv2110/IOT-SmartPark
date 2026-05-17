import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  ContactShadows,
  Float,
  Html,
  PresentationControls,
  Text,
} from "@react-three/drei";
import * as THREE from "three";

/**
 * Lightweight, on-theme 3D scene for the hero. No external assets.
 * Renders a small parking lot diorama with parked cars, a glowing "P" pin,
 * and ambient particles. Designed for 60fps on low-end devices.
 */

function Car({
  position,
  color,
  rotationY = 0,
  bobSeed = 0,
}: {
  position: [number, number, number];
  color: string;
  rotationY?: number;
  bobSeed?: number;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (!ref.current) return;
    const t = s.clock.getElapsedTime();
    ref.current.position.y = position[1] + Math.sin(t * 1.2 + bobSeed) * 0.015;
  });
  return (
    <group ref={ref} position={position} rotation={[0, rotationY, 0]}>
      {/* body */}
      <mesh castShadow receiveShadow position={[0, 0.18, 0]}>
        <boxGeometry args={[0.9, 0.22, 0.45]} />
        <meshPhysicalMaterial
          color={color}
          metalness={0.7}
          roughness={0.28}
          clearcoat={1}
          clearcoatRoughness={0.15}
        />
      </mesh>
      {/* cabin */}
      <mesh castShadow position={[-0.05, 0.36, 0]}>
        <boxGeometry args={[0.55, 0.18, 0.4]} />
        <meshPhysicalMaterial
          color="#0b1220"
          metalness={0.3}
          roughness={0.1}
          transmission={0.4}
          thickness={0.3}
          clearcoat={1}
        />
      </mesh>
      {/* wheels */}
      {[
        [-0.32, 0.07, 0.21],
        [0.32, 0.07, 0.21],
        [-0.32, 0.07, -0.21],
        [0.32, 0.07, -0.21],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.06, 18]} />
          <meshStandardMaterial color="#111" roughness={0.6} />
        </mesh>
      ))}
      {/* head/tail lights */}
      <mesh position={[0.46, 0.2, 0]}>
        <boxGeometry args={[0.02, 0.06, 0.32]} />
        <meshStandardMaterial color="#fffbe6" emissive="#fffbe6" emissiveIntensity={0.9} />
      </mesh>
      <mesh position={[-0.46, 0.2, 0]}>
        <boxGeometry args={[0.02, 0.06, 0.32]} />
        <meshStandardMaterial color="#ff5566" emissive="#ff3344" emissiveIntensity={0.7} />
      </mesh>
    </group>
  );
}

function Lot() {
  // procedural texture: parking grid lines on dark asphalt
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#101826";
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 4;
    // 6 parking bays
    const w = 512 / 6;
    for (let i = 0; i <= 6; i++) {
      ctx.beginPath();
      ctx.moveTo(i * w, 90);
      ctx.lineTo(i * w, 230);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i * w, 290);
      ctx.lineTo(i * w, 430);
      ctx.stroke();
    }
    // top/bottom rails
    ctx.beginPath();
    ctx.moveTo(0, 90);
    ctx.lineTo(512, 90);
    ctx.moveTo(0, 230);
    ctx.lineTo(512, 230);
    ctx.moveTo(0, 290);
    ctx.lineTo(512, 290);
    ctx.moveTo(0, 430);
    ctx.lineTo(512, 430);
    ctx.stroke();
    // dashed center line
    ctx.setLineDash([16, 12]);
    ctx.strokeStyle = "rgba(255,210,80,0.6)";
    ctx.beginPath();
    ctx.moveTo(0, 256);
    ctx.lineTo(512, 256);
    ctx.stroke();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, []);

  return (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[6, 4]} />
      <meshStandardMaterial map={tex} roughness={0.85} metalness={0.05} />
    </mesh>
  );
}

function PPin() {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.rotation.y = s.clock.getElapsedTime() * 0.6;
  });
  return (
    <Float speed={2} rotationIntensity={0} floatIntensity={0.6}>
      <group position={[0, 1.3, 0]}>
        <group ref={ref}>
          {/* pin body */}
          <mesh castShadow>
            <cylinderGeometry args={[0.32, 0.32, 0.5, 32]} />
            <meshPhysicalMaterial
              color="#22d3ee"
              metalness={0.5}
              roughness={0.2}
              emissive="#22d3ee"
              emissiveIntensity={0.55}
              clearcoat={1}
            />
          </mesh>
          <Text
            position={[0, 0, 0.33]}
            fontSize={0.4}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.012}
            outlineColor="#0b1220"
          >
            P
          </Text>
          <Text
            position={[0, 0, -0.33]}
            rotation={[0, Math.PI, 0]}
            fontSize={0.4}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.012}
            outlineColor="#0b1220"
          >
            P
          </Text>
        </group>
        {/* glow ring under pin */}
        <mesh position={[0, -0.32, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.36, 0.55, 48]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.35} />
        </mesh>
      </group>
    </Float>
  );
}

function Particles({ count = 120 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 8;
      arr[i * 3 + 1] = Math.random() * 3 + 0.2;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 5;
    }
    return arr;
  }, [count]);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.rotation.y = s.clock.getElapsedTime() * 0.05;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#a78bfa"
        transparent
        opacity={0.65}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function Loader() {
  return (
    <Html center>
      <div className="px-3 py-1.5 rounded-lg glass text-xs text-muted-foreground">
        Đang dựng cảnh 3D…
      </div>
    </Html>
  );
}

const CAR_COLORS = ["#22d3ee", "#a78bfa", "#f5a524", "#ef4444", "#10b981", "#3b82f6"];

export function ParkingDiorama() {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  // 6 cars in 2 rows along the painted bays, leaving the middle for the P pin
  const cars: Array<{ pos: [number, number, number]; color: string; rot: number; seed: number }> = useMemo(() => {
    const items: Array<{ pos: [number, number, number]; color: string; rot: number; seed: number }> = [];
    const xs = [-2.0, -1.05, 1.05, 2.0];
    const zsTop = -1.05;
    const zsBot = 1.05;
    xs.forEach((x, i) => {
      items.push({ pos: [x, 0, zsTop], color: CAR_COLORS[i % CAR_COLORS.length], rot: Math.PI, seed: i });
      items.push({ pos: [x, 0, zsBot], color: CAR_COLORS[(i + 2) % CAR_COLORS.length], rot: 0, seed: i + 4 });
    });
    return items;
  }, []);

  return (
    <Canvas
      shadows={!isMobile}
      camera={{ position: [3.4, 2.8, 4.2], fov: 34 }}
      dpr={[1, isMobile ? 1.25 : 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#00000000"]} />
      <fog attach="fog" args={["#0b1220", 9, 22]} />
      <Suspense fallback={<Loader />}>
        <ambientLight intensity={0.55} />
        <hemisphereLight args={["#cfe1ff", "#1a1330", 0.55]} />
        <directionalLight
          castShadow={!isMobile}
          position={[5, 7, 4]}
          intensity={1.3}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-far={20}
          shadow-camera-left={-6}
          shadow-camera-right={6}
          shadow-camera-top={6}
          shadow-camera-bottom={-6}
        />
        <pointLight position={[-3, 2, 2]} intensity={0.7} color="#a78bfa" />
        <pointLight position={[3, 2, -2]} intensity={0.6} color="#22d3ee" />
        <Environment preset="city" />

        <PresentationControls
          global
          snap
          rotation={[0, -0.25, 0]}
          polar={[-Math.PI / 12, Math.PI / 6]}
          azimuth={[-Math.PI / 4, Math.PI / 4]}
        >
          <group position={[0, -0.4, 0]}>
            <Lot />
            {cars.map((c, i) => (
              <Car key={i} position={c.pos} color={c.color} rotationY={c.rot} bobSeed={c.seed} />
            ))}
            <PPin />
          </group>
        </PresentationControls>

        <Particles count={isMobile ? 60 : 140} />

        <ContactShadows
          position={[0, -0.4, 0]}
          opacity={0.55}
          scale={12}
          blur={3}
          far={4}
        />
      </Suspense>
    </Canvas>
  );
}
