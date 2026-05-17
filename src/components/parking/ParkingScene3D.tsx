import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Float } from "@react-three/drei";
import * as THREE from "three";
import type { FloorLayout } from "@/lib/slot-layout";

interface Props {
  layout: FloorLayout;
  selectedSlotId?: string | null;
  onSelectSlot?: (slotId: string) => void;
  pathCells?: Array<[number, number]>;
}

const SLOT_W = 1.6;
const SLOT_D = 2.6;
const GAP = 0.18;

function Slot({
  x,
  z,
  occupied,
  selected,
  onPath,
  onClick,
  label,
}: {
  x: number;
  z: number;
  occupied: boolean;
  selected: boolean;
  onPath: boolean;
  onClick: () => void;
  label: string;
}) {
  const color = selected
    ? "#f5a524"
    : occupied
      ? "#ef4444"
      : "#22d3ee";
  const emissive = selected
    ? "#f5a524"
    : occupied
      ? "#7f1d1d"
      : "#0e7490";
  const carRef = useRef<THREE.Mesh>(null);

  useFrame((_, dt) => {
    if (!carRef.current) return;
    carRef.current.position.y = THREE.MathUtils.lerp(
      carRef.current.position.y,
      0.35,
      Math.min(1, dt * 4)
    );
  });

  return (
    <group position={[x, 0, z]} onClick={onClick}>
      {/* Slot floor */}
      <mesh receiveShadow position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[SLOT_W, SLOT_D]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={selected ? 0.9 : occupied ? 0.2 : 0.5}
          metalness={0.1}
          roughness={0.7}
          transparent
          opacity={onPath ? 0.95 : 0.55}
        />
      </mesh>
      {/* Border lines */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry
          args={[
            Math.min(SLOT_W, SLOT_D) * 0.45,
            Math.min(SLOT_W, SLOT_D) * 0.46,
            32,
          ]}
        />
        <meshBasicMaterial color={color} transparent opacity={0.0} />
      </mesh>
      {/* Car if occupied */}
      {occupied && (
        <Float speed={1.2} floatIntensity={0.05} rotationIntensity={0.05}>
          <mesh ref={carRef} position={[0, 0.35, 0]} castShadow>
            <boxGeometry args={[SLOT_W * 0.7, 0.5, SLOT_D * 0.78]} />
            <meshStandardMaterial color="#1f2937" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.7, -0.15]} castShadow>
            <boxGeometry args={[SLOT_W * 0.6, 0.35, SLOT_D * 0.45]} />
            <meshStandardMaterial color="#0f172a" metalness={0.7} roughness={0.3} />
          </mesh>
        </Float>
      )}
      {/* Label badge floating above */}
      <mesh position={[0, 0.05, SLOT_D / 2 - 0.25]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.6, 0.25]} />
        <meshBasicMaterial color="#0b1220" transparent opacity={0.6} />
      </mesh>
      {/* selected marker pillar */}
      {selected && (
        <mesh position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 2.4, 12]} />
          <meshStandardMaterial
            color="#f5a524"
            emissive="#f5a524"
            emissiveIntensity={1.5}
          />
        </mesh>
      )}
      {/* path glow */}
      {onPath && (
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[SLOT_W * 0.7, SLOT_D * 0.2]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.7} />
        </mesh>
      )}
      {/* invisible hover label via title not possible in 3D – tooltip handled outside */}
      <mesh visible={false}>
        <boxGeometry args={[SLOT_W, 0.01, SLOT_D]} />
      </mesh>
      {/* Slot text via small canvas-baked? skip – simple */}
      <SlotLabel label={label} />
    </group>
  );
}

function SlotLabel({ label }: { label: string }) {
  // simple text via Drei <Text> would require extra. Use position-only for now.
  // Keep label hidden in 3D; rely on tooltip in HUD. Returning null to skip.
  void label;
  return null;
}

function Scene({ layout, selectedSlotId, onSelectSlot, pathCells }: Props) {
  const pathSet = useMemo(
    () => new Set((pathCells ?? []).map(([r, c]) => `${r},${c}`)),
    [pathCells]
  );

  const slotsW = layout.cols * (SLOT_W + GAP);
  const slotsD = layout.rows * (SLOT_D + GAP);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[8, 12, 6]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[0, 6, 0]} intensity={0.5} color="#22d3ee" />

      {/* Floor */}
      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.02, 0]}
      >
        <planeGeometry args={[slotsW + 6, slotsD + 6]} />
        <meshStandardMaterial color="#0f172a" roughness={0.95} metalness={0} />
      </mesh>
      {/* Entry strip */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-slotsW / 2 - 1.4, 0.01, 0]}>
        <planeGeometry args={[1.4, slotsD]} />
        <meshStandardMaterial
          color="#22d3ee"
          emissive="#22d3ee"
          emissiveIntensity={0.3}
          transparent
          opacity={0.25}
        />
      </mesh>

      {layout.slots.map((sp) => {
        const x = sp.col * (SLOT_W + GAP) - (slotsW - SLOT_W) / 2;
        const z = sp.row * (SLOT_D + GAP) - (slotsD - SLOT_D) / 2;
        return (
          <Slot
            key={sp.slot.id}
            x={x}
            z={z}
            occupied={sp.slot.is_occupied}
            selected={selectedSlotId === sp.slot.id}
            onPath={pathSet.has(`${sp.row},${sp.col}`)}
            onClick={() => !sp.slot.is_occupied && onSelectSlot?.(sp.slot.id)}
            label={sp.slot.slot_number}
          />
        );
      })}

      <OrbitControls
        enablePan
        maxPolarAngle={Math.PI / 2.2}
        minDistance={6}
        maxDistance={40}
      />
      <Suspense fallback={null}>
        <Environment preset="city" />
      </Suspense>
    </>
  );
}

export function ParkingScene3D(props: Props) {
  return (
    <div className="rounded-2xl overflow-hidden glass h-[520px] relative">
      <div className="absolute top-3 left-3 z-10 text-[10px] uppercase tracking-wider text-muted-foreground glass px-2 py-1 rounded-md">
        Tầng {props.layout.floor} • Kéo để xoay • Cuộn để zoom
      </div>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [12, 14, 14], fov: 45 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#0b1220"]} />
        <fog attach="fog" args={["#0b1220", 25, 60]} />
        <Scene {...props} />
      </Canvas>
    </div>
  );
}
