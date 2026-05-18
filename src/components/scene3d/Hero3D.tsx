import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  ContactShadows,
  PresentationControls,
  useGLTF,
  useAnimations,
  Html,
  Float,
} from "@react-three/drei";
import * as THREE from "three";

// Littlest Tokyo by Glen Fox (CC-BY 4.0) — hosted on threejs.org CDN.
// Animated, draco-compressed city diorama. Drei loads draco automatically
// when the second arg to useGLTF is true.
const CITY_URL = "https://threejs.org/examples/models/gltf/LittlestTokyo.glb";

function City() {
  const group = useRef<THREE.Group>(null);
  const gltf = useGLTF(CITY_URL, true);
  const { actions, names } = useAnimations(gltf.animations, group);

  useEffect(() => {
    const first = names[0];
    if (first && actions[first]) {
      actions[first]!.reset().play();
      actions[first]!.timeScale = 1;
    }
    gltf.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
  }, [actions, names, gltf.scene]);

  // Gentle idle rotation
  useFrame((s) => {
    if (group.current) {
      group.current.rotation.y =
        Math.sin(s.clock.getElapsedTime() * 0.15) * 0.25;
    }
  });

  return (
    <group ref={group} position={[0, -0.9, 0]} scale={0.011}>
      <primitive object={gltf.scene} />
    </group>
  );
}
useGLTF.preload(CITY_URL, true);

function Pin({ color = "#22d3ee" }: { color?: string }) {
  return (
    <Float speed={2} rotationIntensity={0.4} floatIntensity={0.8}>
      <group position={[1.1, 1.4, 0.2]}>
        <mesh castShadow>
          <coneGeometry args={[0.16, 0.46, 28]} />
          <meshPhysicalMaterial
            color={color}
            metalness={0.6}
            roughness={0.18}
            clearcoat={1}
            emissive={color}
            emissiveIntensity={0.45}
          />
        </mesh>
        <mesh position={[0, 0.18, 0]}>
          <sphereGeometry args={[0.09, 24, 24]} />
          <meshStandardMaterial
            color="#fff"
            emissive="#fff"
            emissiveIntensity={0.7}
          />
        </mesh>
      </group>
    </Float>
  );
}

function Loader() {
  return (
    <Html center>
      <div className="px-3 py-1.5 rounded-lg glass-strong text-xs text-muted-foreground">
        Đang dựng thành phố 3D…
      </div>
    </Html>
  );
}

export function Hero3D() {
  return (
    <Canvas
      shadows
      camera={{ position: [3.2, 2.2, 4.2], fov: 32 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#00000000"]} />
      <fog attach="fog" args={["#0b1220", 8, 18]} />
      <Suspense fallback={<Loader />}>
        <ambientLight intensity={0.55} />
        <hemisphereLight args={["#bcd4ff", "#1a1330", 0.5]} />
        <directionalLight
          castShadow
          position={[5, 7, 4]}
          intensity={1.4}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-far={20}
          shadow-camera-left={-6}
          shadow-camera-right={6}
          shadow-camera-top={6}
          shadow-camera-bottom={-6}
        />
        <pointLight position={[-3, 2, 2]} intensity={0.6} color="#a78bfa" />
        <pointLight position={[3, 1, -2]} intensity={0.5} color="#22d3ee" />
        <Environment preset="city" />

        <ContactShadows
          position={[0, -0.9, 0]}
          opacity={0.6}
          scale={10}
          blur={2.8}
          far={4}
        />

        <PresentationControls
          global
          snap
          rotation={[0, 0.3, 0]}
          polar={[-Math.PI / 12, Math.PI / 6]}
          azimuth={[-Math.PI / 4, Math.PI / 4]}
        >
          <City />
          <Pin color="#22d3ee" />
        </PresentationControls>
      </Suspense>
    </Canvas>
  );
}
