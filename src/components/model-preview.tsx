"use client";

import { Bounds, Center, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import type { Group } from "three";

function RotatingModel({ url, reduceMotion, margin }: { url: string; reduceMotion: boolean; margin: number }) {
  const group = useRef<Group>(null);
  const { scene } = useGLTF(url, false, true);

  useFrame((_, delta) => {
    if (!group.current || reduceMotion) return;
    group.current.rotation.y += delta * 0.42;
  });

  return (
    <group ref={group} rotation={[0, -0.45, 0]}>
      <Bounds fit observe={false} clip={false} margin={margin} maxDuration={0}>
        <Center bottom>
          <primitive object={scene} />
        </Center>
      </Bounds>
    </group>
  );
}

export function ModelPreview({ url, label, margin = 0.72 }: { url: string; label: string; margin?: number }) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return (
    <Canvas
      aria-label={`Modelo tridimensional de ${label}`}
      camera={{ position: [4, 3, 6], fov: 34 }}
      dpr={1}
      frameloop={reduceMotion ? "demand" : "always"}
      resize={{ scroll: false, debounce: 120 }}
      gl={{
        antialias: false,
        alpha: false,
        powerPreference: "high-performance",
        stencil: false,
        depth: true,
      }}
      style={{ background: "#dce3d8" }}
    >
      <ambientLight intensity={1.25} />
      <directionalLight position={[4, 7, 5]} intensity={2.4} />
      <directionalLight position={[-4, 2, -3]} intensity={0.85} color="#d78142" />
      <Suspense fallback={null}>
        <RotatingModel key={url} url={url} reduceMotion={reduceMotion} margin={margin} />
      </Suspense>
    </Canvas>
  );
}
