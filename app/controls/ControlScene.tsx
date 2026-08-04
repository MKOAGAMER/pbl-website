'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { ControlSchemeId } from './types';

type Props = {
  schemeId: ControlSchemeId;
  activeTokens: string[];
  wrongToken?: string | null;
  mutedHints?: boolean;
};

type ControlMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> & {
  userData: { token?: string; baseY?: number };
};

const ORANGE = new THREE.Color('#ff6b22');
const RED = new THREE.Color('#ff405d');
const KEY = new THREE.Color('#232a31');
const FACE = new THREE.Color('#151a20');

function textTexture(label: string, color = '#f8fafc') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext('2d')!;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = color;
  context.font = `800 ${label.length > 9 ? 25 : label.length > 5 ? 32 : 42}px Arial`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, 128, 66);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function addLabel(parent: THREE.Object3D, label: string, width: number, y: number, z = 0) {
  const material = new THREE.MeshBasicMaterial({
    map: textTexture(label),
    transparent: true,
    depthWrite: false,
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(width * 0.82, 1.4), 0.42), material);
  plane.rotation.x = -Math.PI / 2;
  plane.position.set(0, y, z);
  plane.renderOrder = 3;
  parent.add(plane);
}

function registerMesh(registry: Map<string, ControlMesh[]>, token: string, mesh: ControlMesh) {
  mesh.userData.token = token;
  mesh.userData.baseY = mesh.position.y;
  const meshes = registry.get(token) ?? [];
  meshes.push(mesh);
  registry.set(token, meshes);
}

function createKeyboard(registry: Map<string, ControlMesh[]>) {
  const group = new THREE.Group();
  group.rotation.x = -0.08;
  group.rotation.y = -0.08;

  const deck = new THREE.Mesh(
    new RoundedBoxGeometry(12.9, 0.4, 5.2, 6, 0.18),
    new THREE.MeshStandardMaterial({ color: '#101419', roughness: 0.72, metalness: 0.25 }),
  );
  deck.position.y = -0.04;
  group.add(deck);

  const rows: Array<{ labels: string[]; x: number; z: number }> = [
    { labels: ['1', '2', '3', '4'], x: -5.75, z: -1.72 },
    { labels: ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'], x: -4.4, z: -0.79 },
    { labels: ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'], x: -3.96, z: 0.15 },
    { labels: ['Shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M'], x: -3.91, z: 1.09 },
  ];

  for (const row of rows) {
    let cursor = row.x;
    for (const label of row.labels) {
      const width = label === 'Shift' ? 1.65 : 0.76;
      const material = new THREE.MeshStandardMaterial({ color: KEY.clone(), roughness: 0.52, metalness: 0.2, emissive: '#000000' });
      const key = new THREE.Mesh(new RoundedBoxGeometry(width, 0.32, 0.82, 4, 0.09), material) as ControlMesh;
      key.position.set(cursor + width / 2, 0.35, row.z);
      key.castShadow = true;
      addLabel(key, label, width, 0.172);
      registerMesh(registry, label, key);
      group.add(key);
      cursor += width + 0.12;
    }
  }

  const spaceMaterial = new THREE.MeshStandardMaterial({ color: KEY.clone(), roughness: 0.52, metalness: 0.2, emissive: '#000000' });
  const space = new THREE.Mesh(new RoundedBoxGeometry(5.2, 0.32, 0.8, 4, 0.09), spaceMaterial) as ControlMesh;
  space.position.set(0.15, 0.35, 2.03);
  space.castShadow = true;
  addLabel(space, 'SPACE', 2.3, 0.172);
  registerMesh(registry, 'Space', space);
  group.add(space);

  return group;
}

function createGamepad(registry: Map<string, ControlMesh[]>) {
  const group = new THREE.Group();
  group.rotation.x = -0.05;
  group.rotation.y = -0.08;

  const bodyMaterial = new THREE.MeshStandardMaterial({ color: FACE.clone(), roughness: 0.44, metalness: 0.32 });
  const core = new THREE.Mesh(new RoundedBoxGeometry(7.5, 0.72, 3.7, 8, 0.65), bodyMaterial);
  core.position.y = 0.05;
  core.castShadow = true;
  group.add(core);

  for (const x of [-2.65, 2.65]) {
    const handle = new THREE.Mesh(new RoundedBoxGeometry(2.15, 0.78, 3.8, 8, 0.7), bodyMaterial.clone());
    handle.position.set(x, -0.1, 1.22);
    handle.rotation.x = -0.2;
    handle.rotation.y = x < 0 ? -0.18 : 0.18;
    handle.castShadow = true;
    group.add(handle);
  }

  const buttonMaterial = (color = '#252d36') => new THREE.MeshStandardMaterial({ color, roughness: 0.38, metalness: 0.28, emissive: '#000000' });

  const roundButton = (token: string, label: string, x: number, z: number, color?: string, radius = 0.34) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.24, 32), buttonMaterial(color)) as ControlMesh;
    mesh.position.set(x, 0.58, z);
    mesh.castShadow = true;
    addLabel(mesh, label, radius * 2, 0.13);
    registerMesh(registry, token, mesh);
    group.add(mesh);
  };

  const boxButton = (token: string, label: string, x: number, z: number, width = 0.74, depth = 0.66) => {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(width, 0.23, depth, 4, 0.09), buttonMaterial()) as ControlMesh;
    mesh.position.set(x, 0.56, z);
    mesh.castShadow = true;
    addLabel(mesh, label, width, 0.122);
    registerMesh(registry, token, mesh);
    group.add(mesh);
  };

  roundButton('Y', 'Y / △', 2.72, -1.08, '#745f21');
  roundButton('X', 'X / □', 2.02, -0.38, '#205784');
  roundButton('B', 'B / ○', 3.42, -0.38, '#7c2630');
  roundButton('A', 'A / ×', 2.72, 0.32, '#276c50');

  const directionControl = 'D-Pad';
  const directionPositions: Array<[string, string, number, number]> = [
    [`${directionControl} Up`, '▲', -2.6, -1.06],
    [`${directionControl} Left`, '◀', -3.23, -0.43],
    [`${directionControl} Down`, '▼', -2.6, 0.2],
    [`${directionControl} Right`, '▶', -1.97, -0.43],
  ];
  directionPositions.forEach(([token, label, x, z]) => boxButton(token, label, x, z, 0.68, 0.68));

  const stickPositions: Array<[string, number, number]> = [
    ['LS', -1.2, 0.78],
    ['RS', 1.1, 0.86],
  ];
  for (const [stick, x, z] of stickPositions) {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.61, 0.68, 0.28, 32), buttonMaterial('#11161b'));
    base.position.set(x, 0.54, z);
    group.add(base);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.48, 0.28, 32), buttonMaterial('#303842')) as ControlMesh;
    cap.position.set(x, 0.77, z);
    cap.castShadow = true;
    addLabel(cap, stick, 0.7, 0.15);
    registerMesh(registry, stick === 'LS' ? 'L3' : 'R3', cap);
    for (const direction of ['Up', 'Down', 'Left', 'Right']) registerMesh(registry, `${stick} ${direction}`, cap);
    group.add(cap);
  }

  boxButton('LB', 'LB', -2.4, -2.0, 1.32, 0.46);
  boxButton('RB', 'RB', 2.4, -2.0, 1.32, 0.46);
  boxButton('LT', 'LT', -3.45, -1.83, 1.18, 0.5);
  boxButton('RT', 'RT', 3.45, -1.83, 1.18, 0.5);

  return group;
}

export default function ControlScene({ schemeId, activeTokens, wrongToken, mutedHints = false }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const registryRef = useRef(new Map<string, ControlMesh[]>());
  const activeRef = useRef(new Set(activeTokens));
  const wrongRef = useRef<string | null>(wrongToken ?? null);
  const mutedRef = useRef(mutedHints);

  useEffect(() => {
    activeRef.current = new Set(activeTokens);
    wrongRef.current = wrongToken ?? null;
    mutedRef.current = mutedHints;
  }, [activeTokens, mutedHints, wrongToken]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog('#090d11', 12, 27);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, schemeId === 'keyboard_pc' ? 7.7 : 7.2, schemeId === 'keyboard_pc' ? 9.5 : 8.4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = false;
    controls.minDistance = 6.2;
    controls.maxDistance = 16;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.target.set(0, 0, 0);

    scene.add(new THREE.HemisphereLight('#dff4ff', '#14100b', 2.05));
    const keyLight = new THREE.DirectionalLight('#ffb072', 4.2);
    keyLight.position.set(-3, 8, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight('#ff5a20', 35, 18, 2);
    rimLight.position.set(6, 2.5, -4);
    scene.add(rimLight);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(11, 64),
      new THREE.MeshStandardMaterial({ color: '#0b1015', roughness: 0.88, metalness: 0.12 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.48;
    floor.receiveShadow = true;
    scene.add(floor);
    const grid = new THREE.GridHelper(18, 18, '#713416', '#1e2a31');
    grid.position.y = -0.46;
    scene.add(grid);

    const registry = new Map<string, ControlMesh[]>();
    registryRef.current = registry;
    const model = schemeId === 'keyboard_pc' ? createKeyboard(registry) : createGamepad(registry);
    scene.add(model);

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    const clock = new THREE.Clock();
    let frame = 0;
    const animate = () => {
      frame = window.requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      for (const [token, meshes] of registry) {
        const active = !mutedRef.current && activeRef.current.has(token);
        const wrong = wrongRef.current === token;
        for (const mesh of meshes) {
          const baseY = mesh.userData.baseY ?? 0;
          const lift = active ? 0.16 + Math.sin(elapsed * 7) * 0.025 : wrong ? 0.1 : 0;
          mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, baseY + lift, 0.16);
          const targetScale = active ? 1.08 : wrong ? 1.05 : 1;
          mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.14);
          mesh.material.color.lerp(active ? ORANGE : wrong ? RED : KEY, 0.18);
          mesh.material.emissive.lerp(active ? ORANGE : wrong ? RED : new THREE.Color('#000000'), 0.18);
          mesh.material.emissiveIntensity = active ? 0.8 : wrong ? 0.92 : 0;
        }
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      controls.dispose();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          if ('map' in material && material.map instanceof THREE.Texture) material.map.dispose();
          material.dispose();
        });
      });
      renderer.dispose();
      renderer.domElement.remove();
      registry.clear();
    };
  }, [schemeId]);

  return <div ref={mountRef} className="h-full min-h-[24rem] w-full" aria-label="Interactive 3D control model" />;
}
