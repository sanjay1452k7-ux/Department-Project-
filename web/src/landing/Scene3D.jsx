import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * The WebGL layer behind the landing page.
 *
 * One scroll value (0 → 1) drives everything: the camera dolly, the colour
 * theme, which polyhedron the "idea core" has morphed into, how fast its
 * satellites orbit, and how the collaboration mesh breathes. Each landing
 * section owns a slice of that range, so scrolling reads as one continuous
 * shot rather than five separate animations.
 */

// One entry per landing section. `color` tints the core and the mesh, `camera`
// is where the camera settles, `shape` is which solid the core has become.
const STAGES = [
  { color: 0x3366f2, camera: [0, 0, 6.2], shape: 'icosahedron', spin: 0.35 },
  { color: 0x22d3ee, camera: [1.6, 0.4, 5.0], shape: 'box', spin: 0.5 },
  { color: 0xa855f7, camera: [-1.7, -0.3, 4.4], shape: 'octahedron', spin: 0.7 },
  { color: 0xf59e0b, camera: [1.2, 0.7, 3.8], shape: 'torusKnot', spin: 0.9 },
  { color: 0x34d399, camera: [0, 0, 5.6], shape: 'dodecahedron', spin: 0.45 },
];

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smoothstep = (t) => t * t * (3 - 2 * t);

function buildGeometries() {
  return {
    icosahedron: new THREE.IcosahedronGeometry(1.35, 1),
    box: new THREE.BoxGeometry(1.9, 1.9, 1.9, 2, 2, 2),
    octahedron: new THREE.OctahedronGeometry(1.6, 1),
    torusKnot: new THREE.TorusKnotGeometry(0.95, 0.32, 90, 12),
    dodecahedron: new THREE.DodecahedronGeometry(1.45, 0),
  };
}

export default function Scene3D({ progressRef }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      // No WebGL (old browser, blocked GPU) — the CSS gradient behind the
      // canvas is the fallback, so we just bail out quietly.
      return undefined;
    }
    if (!renderer.getContext()) return undefined;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05071a, 0.055);

    const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 100);
    camera.position.set(0, 0, 6.2);

    // Phones do not need retina-density WebGL; capping DPR keeps it smooth.
    const maxDpr = window.innerWidth < 768 ? 1.5 : 2;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    // ---- lights -------------------------------------------------------------
    scene.add(new THREE.AmbientLight(0x8899ff, 0.6));
    const keyLight = new THREE.PointLight(0x3366f2, 90, 40);
    keyLight.position.set(4, 5, 6);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x22d3ee, 60, 40);
    rimLight.position.set(-5, -3, 4);
    scene.add(rimLight);

    // ---- the idea core ------------------------------------------------------
    const geometries = buildGeometries();
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0x0b1030,
      emissive: new THREE.Color(STAGES[0].color),
      emissiveIntensity: 0.75,
      metalness: 0.85,
      roughness: 0.25,
      transparent: true,
      opacity: 0.92,
    });
    const core = new THREE.Mesh(geometries.icosahedron, coreMaterial);

    const wireMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(STAGES[0].color),
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });
    const wire = new THREE.Mesh(geometries.icosahedron, wireMaterial);
    wire.scale.setScalar(1.06);

    const coreGroup = new THREE.Group();
    coreGroup.add(core, wire);
    scene.add(coreGroup);

    // ---- satellites: the teams orbiting the problem -------------------------
    const SATELLITES = 7;
    const satelliteMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: new THREE.Color(0x3366f2),
      emissiveIntensity: 1.4,
      metalness: 0.6,
      roughness: 0.3,
    });
    const satelliteGeometry = new THREE.BoxGeometry(0.13, 0.13, 0.13);
    const satellites = new THREE.InstancedMesh(satelliteGeometry, satelliteMaterial, SATELLITES);
    satellites.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const orbits = Array.from({ length: SATELLITES }, (_, i) => ({
      radius: 2.1 + (i % 3) * 0.55,
      speed: 0.25 + (i % 4) * 0.12,
      phase: (i / SATELLITES) * Math.PI * 2,
      tilt: (i - SATELLITES / 2) * 0.22,
    }));
    scene.add(satellites);

    // ---- collaboration mesh: nodes joined by lines --------------------------
    const NODE_COUNT = 42;
    const nodePositions = new Float32Array(NODE_COUNT * 3);
    const nodeSeeds = [];
    for (let i = 0; i < NODE_COUNT; i += 1) {
      const r = 3.6 + Math.random() * 2.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      nodeSeeds.push({ r, theta, phi, drift: 0.15 + Math.random() * 0.35 });
      nodePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      nodePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
      nodePositions[i * 3 + 2] = r * Math.cos(phi);
    }
    const nodeGeometry = new THREE.BufferGeometry();
    nodeGeometry.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3));
    const nodes = new THREE.Points(
      nodeGeometry,
      new THREE.PointsMaterial({ color: 0x9db8ff, size: 0.075, transparent: true, opacity: 0.9 }),
    );
    scene.add(nodes);

    // Links are rebuilt each frame from whichever nodes drifted close together.
    const MAX_LINKS = 160;
    const linkPositions = new Float32Array(MAX_LINKS * 6);
    const linkGeometry = new THREE.BufferGeometry();
    linkGeometry.setAttribute('position', new THREE.BufferAttribute(linkPositions, 3));
    const linkMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(STAGES[0].color),
      transparent: true,
      opacity: 0.22,
    });
    const links = new THREE.LineSegments(linkGeometry, linkMaterial);
    scene.add(links);

    // ---- starfield ----------------------------------------------------------
    const STAR_COUNT = window.innerWidth < 768 ? 700 : 1500;
    const starPositions = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i += 1) {
      starPositions[i * 3] = (Math.random() - 0.5) * 60;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 50 - 10;
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({ color: 0xc7d6ff, size: 0.055, transparent: true, opacity: 0.55 }),
    );
    scene.add(stars);

    // ---- retro grid floor ---------------------------------------------------
    const grid = new THREE.GridHelper(70, 70, 0x3366f2, 0x1b2a6b);
    grid.material.transparent = true;
    grid.material.opacity = 0.22;
    grid.position.y = -3.2;
    scene.add(grid);

    // ---- resize -------------------------------------------------------------
    const resize = () => {
      const width = mount.clientWidth || window.innerWidth;
      const height = mount.clientHeight || window.innerHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);

    // ---- pointer parallax ---------------------------------------------------
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const onPointerMove = (e) => {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    if (!reduceMotion) window.addEventListener('pointermove', onPointerMove, { passive: true });

    // ---- animation ----------------------------------------------------------
    const dummy = new THREE.Object3D();
    const colorA = new THREE.Color();
    const colorB = new THREE.Color();
    const stageColors = STAGES.map((s) => new THREE.Color(s.color));

    let currentShape = 'icosahedron';
    let morphPop = 1; // scale bounce played when the core changes shape
    let eased = 0; // scroll progress, lerped so it never snaps
    let raf = 0;
    const clock = new THREE.Clock();

    const renderFrame = () => {
      const t = clock.getElapsedTime();
      const target = clamp01(progressRef.current || 0);
      eased = reduceMotion ? target : lerp(eased, target, 0.075);

      // Where we are between two stages.
      const scaled = eased * (STAGES.length - 1);
      const index = Math.min(STAGES.length - 2, Math.floor(scaled));
      const blend = smoothstep(clamp01(scaled - index));
      const from = STAGES[index];
      const to = STAGES[index + 1];

      // Colour theme.
      colorA.copy(stageColors[index]);
      colorB.copy(stageColors[index + 1]);
      colorA.lerp(colorB, blend);
      coreMaterial.emissive.copy(colorA);
      wireMaterial.color.copy(colorA);
      linkMaterial.color.copy(colorA);
      satelliteMaterial.emissive.copy(colorA);
      keyLight.color.copy(colorA);
      grid.material.color.copy(colorA);

      // Camera dolly plus a little pointer parallax.
      pointer.x = lerp(pointer.x, pointer.tx, 0.05);
      pointer.y = lerp(pointer.y, pointer.ty, 0.05);
      camera.position.set(
        lerp(from.camera[0], to.camera[0], blend) + pointer.x * 0.45,
        lerp(from.camera[1], to.camera[1], blend) - pointer.y * 0.35,
        lerp(from.camera[2], to.camera[2], blend),
      );
      camera.lookAt(0, 0, 0);

      // Morph the core when the nearest stage changes.
      const nearest = STAGES[Math.round(scaled)].shape;
      if (nearest !== currentShape) {
        currentShape = nearest;
        core.geometry = geometries[nearest];
        wire.geometry = geometries[nearest];
        morphPop = 0.55;
      }
      morphPop = lerp(morphPop, 1, 0.09);
      const breathe = reduceMotion ? 1 : 1 + Math.sin(t * 1.6) * 0.035;
      // The core is a backdrop, not the subject: keep it small enough that the
      // copy in front of it stays the thing you read first.
      coreGroup.scale.setScalar(morphPop * breathe * 0.72);

      const spin = lerp(from.spin, to.spin, blend);
      if (!reduceMotion) {
        coreGroup.rotation.y += 0.0055 * (1 + spin);
        coreGroup.rotation.x = Math.sin(t * 0.35) * 0.25;
        wire.rotation.y -= 0.004;
      }

      // Satellites orbit faster as the stages progress.
      for (let i = 0; i < SATELLITES; i += 1) {
        const o = orbits[i];
        const angle = o.phase + t * o.speed * (0.6 + spin);
        dummy.position.set(
          Math.cos(angle) * o.radius,
          Math.sin(angle * 0.8) * 0.5 + o.tilt,
          Math.sin(angle) * o.radius,
        );
        dummy.rotation.set(angle, angle * 0.7, 0);
        dummy.updateMatrix();
        satellites.setMatrixAt(i, dummy.matrix);
      }
      satellites.instanceMatrix.needsUpdate = true;

      // Drift the mesh nodes and re-link the close pairs.
      const positions = nodeGeometry.attributes.position.array;
      for (let i = 0; i < NODE_COUNT; i += 1) {
        const seed = nodeSeeds[i];
        const theta = seed.theta + t * seed.drift * 0.15;
        positions[i * 3] = seed.r * Math.sin(seed.phi) * Math.cos(theta);
        positions[i * 3 + 1] =
          seed.r * Math.sin(seed.phi) * Math.sin(theta) * 0.6 + Math.sin(t * 0.5 + i) * 0.12;
        positions[i * 3 + 2] = seed.r * Math.cos(seed.phi);
      }
      nodeGeometry.attributes.position.needsUpdate = true;

      let link = 0;
      const reach = 2.0 + eased * 1.4;
      for (let i = 0; i < NODE_COUNT && link < MAX_LINKS; i += 1) {
        for (let j = i + 1; j < NODE_COUNT && link < MAX_LINKS; j += 1) {
          const dx = positions[i * 3] - positions[j * 3];
          const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
          const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
          if (dx * dx + dy * dy + dz * dz < reach * reach) {
            linkPositions.set(
              [
                positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2],
                positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2],
              ],
              link * 6,
            );
            link += 1;
          }
        }
      }
      linkGeometry.setDrawRange(0, link * 2);
      linkGeometry.attributes.position.needsUpdate = true;

      // Background layers drift with the scroll.
      stars.rotation.y = t * 0.008 + eased * 0.6;
      stars.position.z = eased * 8;
      grid.position.z = (t * 0.6) % 2;
      grid.position.y = -3.2 + eased * 1.6;
      grid.material.opacity = 0.22 * (1 - eased * 0.5);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(renderFrame);
    };

    if (reduceMotion) {
      // Draw one representative frame and stop — no continuous motion.
      renderFrame();
      cancelAnimationFrame(raf);
      renderer.render(scene, camera);
    } else {
      raf = requestAnimationFrame(renderFrame);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      Object.values(geometries).forEach((g) => g.dispose());
      [satelliteGeometry, nodeGeometry, linkGeometry, starGeometry].forEach((g) => g.dispose());
      [coreMaterial, wireMaterial, satelliteMaterial, linkMaterial].forEach((m) => m.dispose());
      nodes.material.dispose();
      stars.material.dispose();
      grid.material.dispose();
      grid.geometry.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [progressRef]);

  return <div ref={mountRef} className="absolute inset-0" aria-hidden="true" />;
}
