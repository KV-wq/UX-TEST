"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface Props {
  intensity?: number;
  className?: string;
}

export default function ThreeBackground({
  intensity = 1,
  className,
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x07090b, 0.07);

    const camera = new THREE.PerspectiveCamera(
      55,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 9);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const geo = new THREE.IcosahedronGeometry(2.2, 2);
    const originalPositions = geo.attributes.position.array.slice() as Float32Array;

    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x22e07a,
      wireframe: true,
      transparent: true,
      opacity: 0.7,
    });
    const wire = new THREE.Mesh(geo, wireMat);
    group.add(wire);

    const outerGeo = new THREE.IcosahedronGeometry(3.6, 1);
    const outerMat = new THREE.LineBasicMaterial({
      color: 0x22e07a,
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
    });
    const outer = new THREE.LineSegments(
      new THREE.WireframeGeometry(outerGeo),
      outerMat
    );
    group.add(outer);

    const particleCount = 420;
    const pPositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const r = 4.2 + Math.random() * 4.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pPositions[i * 3 + 2] = r * Math.cos(phi) * 0.6;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPositions, 3));

    const pMat = new THREE.PointsMaterial({
      color: 0x7ef2b6,
      size: 0.045,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(pGeo, pMat);
    scene.add(points);

    const handleResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    let raf = 0;
    const clock = new THREE.Clock();
    const positionAttr = geo.attributes.position as THREE.BufferAttribute;

    const render = () => {
      const t = clock.getElapsedTime();

      group.rotation.x = t * 0.08;
      group.rotation.y = t * 0.1;
      outer.rotation.x = -t * 0.04;
      outer.rotation.y = -t * 0.05;
      points.rotation.y = t * 0.02;

      for (let i = 0; i < positionAttr.count; i++) {
        const ox = originalPositions[i * 3];
        const oy = originalPositions[i * 3 + 1];
        const oz = originalPositions[i * 3 + 2];
        const n =
          Math.sin(ox * 1.2 + t * 0.9) +
          Math.cos(oy * 1.1 + t * 0.7) +
          Math.sin(oz * 1.3 + t * 1.1);
        const scale = 1 + n * 0.04 * intensity;
        positionAttr.setXYZ(i, ox * scale, oy * scale, oz * scale);
      }
      positionAttr.needsUpdate = true;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      geo.dispose();
      outerGeo.dispose();
      pGeo.dispose();
      wireMat.dispose();
      outerMat.dispose();
      pMat.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [intensity]);

  return (
    <div
      ref={mountRef}
      className={className}
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
      }}
    />
  );
}
