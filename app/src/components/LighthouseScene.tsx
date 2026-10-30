"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import Image from "next/image";

/** Procedural WebGL model. No external model downloads, tracking, or 3D API keys. */
export default function LighthouseScene() {
  const host = useRef<HTMLDivElement>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const parent = host.current;
    if (!parent) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      const id = requestAnimationFrame(() => setUnavailable(true));
      return () => cancelAnimationFrame(id);
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.75;
    renderer.domElement.className = "neul-three-canvas";
    renderer.domElement.setAttribute("aria-hidden", "true");
    parent.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 90);
    camera.position.set(8.7, 6.7, 12.8);
    camera.lookAt(0, 2.45, 0);
    scene.add(new THREE.HemisphereLight(0xb8d8ff, 0x09182c, 3.1));
    const key = new THREE.DirectionalLight(0xffe5a5, 3.6);
    key.position.set(-4, 9, 7);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x65a7d7, 2.8);
    rim.position.set(6, 4, -4);
    scene.add(rim);
    const mat = (color: THREE.ColorRepresentation, metalness = 0.14, roughness = 0.65) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
    const ivory = mat(0xf6ead7, 0.08, 0.73);
    const pale = mat(0xcbd8e2, 0.2, 0.55);
    const navy = mat(0x1b3e63, 0.3, 0.43);
    const gold = mat(0xefb45c, 0.62, 0.3);
    const dark = mat(0x102840, 0.25, 0.45);
    const lightGlass = new THREE.MeshStandardMaterial({ color: 0xffd890, emissive: 0xfabb54, emissiveIntensity: 2.5, roughness: 0.18, metalness: 0.15 });

    function mesh(g: THREE.BufferGeometry, m: THREE.Material, pos: [number, number, number], target: THREE.Object3D = scene) {
      const object = new THREE.Mesh(g, m);
      object.position.set(...pos);
      target.add(object);
      return object;
    }

    // Island / sea: calm, dark and dimensional rather than a distracting simulated ocean.
    mesh(new THREE.CylinderGeometry(2.43, 2.64, 0.34, 64), dark, [0, -0.15, 0]);
    mesh(new THREE.CylinderGeometry(2.37, 2.46, 0.08, 64), navy, [0, 0.07, 0]);
    const rock = mat(0x4b6577, 0.15, 0.9);
    for (let i = 0; i < 21; i++) {
      const a = (i / 21) * Math.PI * 2;
      const r = 2.19 + Math.sin(i * 1.9) * 0.18;
      const k = mesh(new THREE.DodecahedronGeometry(0.22 + (i % 4) * 0.035, 0), rock, [Math.cos(a) * r, 0.15, Math.sin(a) * r]);
      k.rotation.set(0.1 * i, 0.31 * i, 0.22 * i);
    }
    const rings: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const ring = mesh(new THREE.RingGeometry(2.95 + i * 0.71, 2.965 + i * 0.71, 100), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x5fa0c4 : 0x91bed1, transparent: true, opacity: 0.18 - i * 0.027, side: THREE.DoubleSide, depthWrite: false }), [0, -0.18 - i * 0.005, 0]);
      ring.rotation.x = -Math.PI / 2;
      rings.push(ring);
    }

    // Actual 3D lighthouse: tapered stone tower, cobalt stripes, balcony and glazed lantern room.
    mesh(new THREE.CylinderGeometry(1.05, 1.35, 0.44, 48), pale, [0, 0.38, 0]);
    const tower = mesh(new THREE.CylinderGeometry(0.58, 1.06, 4.15, 64), ivory, [0, 2.55, 0]);
    tower.rotation.y = Math.PI / 10;
    mesh(new THREE.CylinderGeometry(0.79, 0.86, 0.24, 48), navy, [0, 1.32, 0]);
    mesh(new THREE.CylinderGeometry(0.71, 0.77, 0.22, 48), navy, [0, 2.48, 0]);
    mesh(new THREE.CylinderGeometry(0.61, 0.68, 0.19, 48), navy, [0, 3.62, 0]);
    mesh(new THREE.CylinderGeometry(0.91, 0.92, 0.18, 64), gold, [0, 4.75, 0]);
    mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.14, 64), dark, [0, 4.87, 0]);
    mesh(new THREE.CylinderGeometry(0.71, 0.71, 0.72, 32), lightGlass, [0, 5.31, 0]);
    // glazing ribs
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI * 2 / 12;
      const rib = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.75, 8), navy, [Math.cos(a) * 0.72, 5.31, Math.sin(a) * 0.72]);
      rib.rotation.y = a;
    }
    mesh(new THREE.CylinderGeometry(0.85, 0.84, 0.15, 48), gold, [0, 5.76, 0]);
    mesh(new THREE.ConeGeometry(0.94, 0.58, 48), navy, [0, 6.11, 0]);
    mesh(new THREE.SphereGeometry(0.12, 12, 12), gold, [0, 6.43, 0]);
    const centralGlow = mesh(new THREE.SphereGeometry(0.35, 20, 16), new THREE.MeshBasicMaterial({ color: 0xfff0ae }), [0, 5.29, 0]);
    centralGlow.scale.set(1, 0.76, 1);
    const lantern = new THREE.PointLight(0xffd184, 12, 11, 2);
    lantern.position.set(0, 5.3, 0);
    scene.add(lantern);

    // Windows and entrance on the viewer-facing side.
    for (const y of [1.9, 3.1]) {
      const w = mesh(new THREE.BoxGeometry(0.32, 0.52, 0.08), dark, [0, y, 0.79]);
      w.rotation.x = -0.05;
      mesh(new THREE.BoxGeometry(0.23, 0.38, 0.085), lightGlass, [0, y, 0.845]);
    }
    const door = mesh(new THREE.BoxGeometry(0.55, 0.95, 0.11), navy, [0, 0.67, 1.09]);
    door.rotation.x = 0.08;
    mesh(new THREE.SphereGeometry(0.045, 10, 10), gold, [0.19, 0.71, 1.19]);

    // Transparent light cone with a real 360-degree sweep around the tower.
    const beacon = new THREE.Group();
    beacon.position.y = 5.3;
    scene.add(beacon);
    const coneGeo = new THREE.ConeGeometry(2.4, 10.5, 48, 1, true);
    coneGeo.translate(0, -5.25, 0);
    coneGeo.rotateZ(-Math.PI / 2); // apex at lighthouse, beam extends toward +X
    const beam = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({ color: 0xffdc8a, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    beacon.add(beam);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.86, 10.2, 48, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff3bd, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    inner.geometry.translate(0, -5.1, 0);
    inner.geometry.rotateZ(-Math.PI / 2);
    beacon.add(inner);
    const beamTip = new THREE.PointLight(0xffc974, 2.5, 8, 2);
    beamTip.position.set(4.5, 0, 0);
    beacon.add(beamTip);

    const clock = new THREE.Clock();
    let handle = 0;
    const resize = () => {
      const { width, height } = parent.getBoundingClientRect();
      if (width < 2 || height < 2) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.fov = width < 600 ? 45 : 35;
      camera.position.set(width < 600 ? 9.5 : 8.7, width < 600 ? 7.8 : 6.7, width < 600 ? 14.3 : 12.8);
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(parent);
    resize();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animate = () => {
      handle = requestAnimationFrame(animate);
      if (document.hidden) return;
      const elapsed = clock.getElapsedTime();
      beacon.rotation.y = reduceMotion ? -0.8 : elapsed * 0.72 - 0.8;
      for (let i = 0; i < rings.length; i++) rings[i].rotation.z = elapsed * (i % 2 ? -0.04 : 0.04);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(handle);
      resizeObserver.disconnect();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of materials) m.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={host} className="neul-lighthouse-scene" role="img" aria-label="Three-dimensional lighthouse with a golden light sweeping in a full circle">{unavailable && <div className="neul-lighthouse-fallback" aria-hidden="true"><div className="neul-fallback-light" /><Image src="/brand/neul-lighthouse.png" alt="" width={320} height={400} /></div>}</div>;
}
