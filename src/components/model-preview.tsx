"use client";

import { Bounds, Center, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import type { Group, Mesh, Material, Texture } from "three";

function disposeMaterial(material: Material | Material[]) {
  const materials = Array.isArray(material) ? material : [material];
  for (const item of materials) {
    for (const value of Object.values(item)) {
      const texture = value as Texture | undefined;
      if (texture && typeof texture === "object" && "isTexture" in texture) texture.dispose();
    }
    item.dispose();
  }
}

function RotatingModel({ url, reduceMotion, margin }: { url: string; reduceMotion: boolean; margin: number }) {
  const group = useRef<Group>(null);
  const { scene } = useGLTF(url, false, true);
  const invalidate = useThree((state) => state.invalidate);

  useFrame((_, delta) => {
    if (!group.current || reduceMotion) return;
    group.current.rotation.y += delta * 0.42;
    invalidate();
  });

  useEffect(() => {
    return () => {
      scene.traverse((object) => {
        const mesh = object as Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        disposeMaterial(mesh.material);
      });
      useGLTF.clear(url);
    };
  }, [scene, url]);

  return (
    <group ref={group} rotation={[0, -0.45, 0]}>
      <Bounds fit margin={margin} maxDuration={0}>
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
      dpr={[1, 1.25]}
      frameloop={reduceMotion ? "demand" : "always"}
      gl={{
        antialias: false,
        alpha: true,
        powerPreference: "high-performance",
        stencil: false,
        depth: true,
      }}
      performance={{ min: 0.5 }}
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
