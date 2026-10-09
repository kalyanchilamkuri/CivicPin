/* Landing page: animated Three.js city, the "variable proximity" headline and
 * the decrypting tagline. Ports the Next.js HeroSection component. */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ------------------------------------------------------------ 3D city ---- */

function initCity(mount) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  mount.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0x404040, 2));
  const directional = new THREE.DirectionalLight(0xffffff, 1);
  directional.position.set(1, 1, 1);
  scene.add(directional);

  const gridSize = 50;
  const cityGroup = new THREE.Group();
  scene.add(cityGroup);

  const gridHelper = new THREE.GridHelper(
    gridSize * 2,
    gridSize * 2,
    0x0088ff,
    0x001a33
  );
  gridHelper.position.y = -0.1;
  cityGroup.add(gridHelper);

  const buildingGeometries = [
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.BoxGeometry(1, 2, 1),
    new THREE.BoxGeometry(1, 3, 1),
    new THREE.BoxGeometry(1, 4, 1),
    new THREE.CylinderGeometry(0.5, 0.5, 2, 6),
  ];

  const buildingMaterials = [
    new THREE.MeshPhongMaterial({ color: 0x3498db, emissive: 0x0a2e52 }),
    new THREE.MeshPhongMaterial({ color: 0x2ecc71, emissive: 0x0b4d28 }),
    new THREE.MeshPhongMaterial({ color: 0xe74c3c, emissive: 0x5c1d16 }),
    new THREE.MeshPhongMaterial({ color: 0xf1c40f, emissive: 0x614e06 }),
    new THREE.MeshPhongMaterial({ color: 0x9b59b6, emissive: 0x3d2348 }),
  ];

  for (let x = -gridSize / 2; x < gridSize / 2; x += 2) {
    for (let z = -gridSize / 2; z < gridSize / 2; z += 2) {
      // Skip some plots so roads and squares appear.
      if (Math.random() > 0.7) continue;

      const geometry =
        buildingGeometries[
          Math.floor(Math.random() * buildingGeometries.length)
        ];
      const material =
        buildingMaterials[Math.floor(Math.random() * buildingMaterials.length)];

      const building = new THREE.Mesh(geometry, material);
      const height = geometry.parameters.height || 1;
      building.position.set(x, height / 2, z);
      building.scale.y = Math.random() * 2 + 0.5;

      if (Math.random() > 0.5) {
        building.rotation.y = Math.PI / (Math.random() * 4);
      }

      cityGroup.add(building);
    }
  }

  // Pulsing markers standing in for "infrastructure needed here".
  const markerPositions = [
    { x: 10, z: 10, type: 'hospital', color: 0xff3333 },
    { x: -15, z: 5, type: 'bank', color: 0x33ff33 },
    { x: 0, z: -20, type: 'school', color: 0x3333ff },
    { x: -8, z: -12, type: 'market', color: 0xffff33 },
    { x: 20, z: -5, type: 'transport', color: 0xff33ff },
  ];

  const markers = [];
  markerPositions.forEach((marker) => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 16),
      new THREE.MeshPhongMaterial({
        color: marker.color,
        emissive: marker.color,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.8,
      })
    );
    mesh.position.set(marker.x, 5, marker.z);
    mesh.userData = {
      type: marker.type,
      scale: 1,
      direction: 1,
      speed: 0.02 + Math.random() * 0.01,
    };

    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(marker.x, 0, marker.z),
        new THREE.Vector3(marker.x, 5, marker.z),
      ]),
      new THREE.LineBasicMaterial({ color: marker.color })
    );

    cityGroup.add(mesh);
    cityGroup.add(line);
    markers.push(mesh);
  });

  // Floating particles.
  const particleCount = 500;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 100;
  }
  const particlesGeometry = new THREE.BufferGeometry();
  particlesGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(positions, 3)
  );
  const particlesMesh = new THREE.Points(
    particlesGeometry,
    new THREE.PointsMaterial({
      size: 0.2,
      color: 0x0088ff,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
    })
  );
  scene.add(particlesMesh);

  camera.position.set(30, 20, 30);
  camera.lookAt(0, 0, 0);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = Math.PI / 2 - 0.1;
  controls.minDistance = 15;
  controls.maxDistance = 60;

  function handleResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', handleResize);

  let frameId;
  function animate() {
    frameId = requestAnimationFrame(animate);

    cityGroup.rotation.y += 0.001;
    particlesMesh.rotation.y += 0.0005;

    markers.forEach((marker, index) => {
      const data = marker.userData;
      if (data.scale > 1.3) data.direction = -1;
      if (data.scale < 0.7) data.direction = 1;
      data.scale += data.speed * data.direction;
      marker.scale.set(data.scale, data.scale, data.scale);
      marker.position.y = 5 + Math.sin(Date.now() * 0.001 + index) * 0.5;
    });

    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  // Pause the render loop while the hero is scrolled out of view.
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !frameId) {
          animate();
        } else if (!entry.isIntersecting && frameId) {
          cancelAnimationFrame(frameId);
          frameId = null;
        }
      });
    },
    { threshold: 0.01 }
  );
  observer.observe(mount);

  return function cleanup() {
    observer.disconnect();
    window.removeEventListener('resize', handleResize);
    if (frameId) cancelAnimationFrame(frameId);
    controls.dispose();
    renderer.dispose();
    mount.removeChild(renderer.domElement);
  };
}

/* ------------------------------------------- variable proximity heading -- */

function initProximityTitle(el, label) {
  const fromWeight = 400;
  const toWeight = 1000;
  const fromOpsz = 9;
  const toOpsz = 40;
  const radius = 150;

  el.textContent = '';
  const letters = label.split('').map((char) => {
    const span = document.createElement('span');
    span.textContent = char === ' ' ? ' ' : char;
    span.style.fontVariationSettings = `'wght' ${fromWeight}, 'opsz' ${fromOpsz}`;
    el.appendChild(span);
    return span;
  });

  let pointer = { x: -9999, y: -9999 };
  let frameId = null;

  function update() {
    frameId = null;
    letters.forEach((span) => {
      const rect = span.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const distance = Math.hypot(pointer.x - cx, pointer.y - cy);
      // Linear falloff, as the original component used.
      const falloff = Math.max(0, 1 - distance / radius);
      const weight = fromWeight + (toWeight - fromWeight) * falloff;
      const opsz = fromOpsz + (toOpsz - fromOpsz) * falloff;
      span.style.fontVariationSettings = `'wght' ${weight.toFixed(
        0
      )}, 'opsz' ${opsz.toFixed(1)}`;
    });
  }

  function onPointerMove(event) {
    pointer = { x: event.clientX, y: event.clientY };
    if (!frameId) frameId = requestAnimationFrame(update);
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener(
    'pointerleave',
    () => {
      pointer = { x: -9999, y: -9999 };
      if (!frameId) frameId = requestAnimationFrame(update);
    },
    { passive: true }
  );
}

/* --------------------------------------------------- decrypting tagline -- */

function initDecryptedText(el, text, speed = 60) {
  const scramble = '!<>-_\\/[]{}—=+*^?#________';
  let revealed = 0;
  let frame = 0;

  function render() {
    let output = '';
    for (let i = 0; i < text.length; i++) {
      if (i < revealed || text[i] === ' ') {
        output += text[i];
      } else {
        output += scramble[Math.floor(Math.random() * scramble.length)];
      }
    }
    el.textContent = output;
  }

  const timer = setInterval(() => {
    frame += 1;
    if (frame % 2 === 0) revealed += 1;
    render();
    if (revealed > text.length) {
      clearInterval(timer);
      el.textContent = text;
    }
  }, speed);
}

/* ----------------------------------------------------------- parallax ---- */

function initParallax(el) {
  let frameId = null;
  window.addEventListener(
    'scroll',
    () => {
      if (frameId) return;
      frameId = requestAnimationFrame(() => {
        frameId = null;
        el.style.transform = `translateY(${window.scrollY * 0.3}px)`;
      });
    },
    { passive: true }
  );
}

/* ----------------------------------------------------------- bootstrap --- */

const mount = document.getElementById('city-canvas');
if (mount) {
  try {
    initCity(mount);
  } catch (error) {
    console.error('Could not start the 3D city:', error);
    mount.style.background =
      'radial-gradient(circle at 50% 120%, #0b2545 0%, #000 70%)';
  }
}

const title = document.getElementById('proximity-title');
if (title) initProximityTitle(title, 'CivicPin');

const tagline = document.getElementById('decrypt-tagline');
if (tagline) {
  initDecryptedText(tagline, 'Mapping Community Infrastructure Together', 55);
}

const heroText = document.getElementById('hero-text');
if (heroText) {
  requestAnimationFrame(() => heroText.classList.replace('opacity-0', 'opacity-100'));
}

const glow = document.getElementById('parallax-glow');
if (glow) initParallax(glow);
