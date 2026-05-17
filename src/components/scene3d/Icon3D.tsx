import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

type Variant = "pin" | "car" | "sensor" | "route";

function Geo({ variant, color }: { variant: Variant; color: string }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (ref.current) ref.current.rotation.y = s.clock.getElapsedTime() * 0.7;
  });
  return (
    <group ref={ref}>
      {variant === "pin" && (
        <>
          <mesh>
            <coneGeometry args={[0.55, 1.3, 28]} />
            <meshStandardMaterial color={color} metalness={0.6} roughness={0.2} emissive={color} emissiveIntensity={0.25} />
          </mesh>
          <mesh position={[0, 0.45, 0]}>
            <sphereGeometry args={[0.22, 24, 24]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        </>
      )}
      {variant === "car" && (
        <group position={[0, -0.1, 0]}>
          <mesh position={[0, 0.25, 0]}>
            <boxGeometry args={[1.3, 0.45, 0.7]} />
            <meshStandardMaterial color={color} metalness={0.55} roughness={0.25} />
          </mesh>
          <mesh position={[0, 0.6, 0]}>
            <boxGeometry args={[0.75, 0.3, 0.6]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.85} />
          </mesh>
          {[[-0.45, 0, 0.36], [0.45, 0, 0.36], [-0.45, 0, -0.36], [0.45, 0, -0.36]].map((p, i) => (
            <mesh key={i} position={p as [number, number, number]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.15, 0.15, 0.16, 20]} />
              <meshStandardMaterial color="#222" />
            </mesh>
          ))}
        </group>
      )}
      {variant === "sensor" && (
        <>
          <mesh>
            <torusGeometry args={[0.5, 0.08, 16, 60]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.22, 24, 24]} />
            <meshStandardMaterial color="#ffffff" emissive={color} emissiveIntensity={0.5} />
          </mesh>
        </>
      )}
      {variant === "route" && (
        <>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <torusGeometry args={[0.55, 0.1, 16, 60, Math.PI * 1.4]} />
            <meshStandardMaterial color={color} metalness={0.6} roughness={0.2} emissive={color} emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[0.45, -0.45, 0]}>
            <coneGeometry args={[0.18, 0.36, 16]} />
            <meshStandardMaterial color={color} metalness={0.6} />
          </mesh>
        </>
      )}
    </group>
  );
}

interface Props {
  variant?: Variant;
  color?: string;
  size?: number;
  className?: string;
}

export function Icon3D({ variant = "pin", color = "#3b82f6", size = 64, className }: Props) {
  return (
    <div style={{ width: size, height: size }} className={className}>
      <Canvas
        camera={{ position: [0, 0.4, 2.6], fov: 40 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[3, 4, 3]} intensity={1.2} />
          <pointLight position={[-3, 2, 2]} intensity={0.5} color="#a78bfa" />
          <Float speed={2} rotationIntensity={0.3} floatIntensity={0.6}>
            <Geo variant={variant} color={color} />
          </Float>
        </Suspense>
      </Canvas>
    </div>
  );
}
