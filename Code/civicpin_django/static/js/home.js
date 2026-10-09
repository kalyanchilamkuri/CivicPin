/* Home page: the rotating blue-marble globe and the "nearby demands" map.
 *
 * The globe is drawn directly with Three.js rather than globe.gl: the original
 * code needed globe.gl and `three` to resolve to one module instance, and
 * doing it by hand keeps a single instance by construction. */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const { api, toast, config, escapeHtml } = window.CI;

/* --------------------------------------------------------------- globe ---- */

function initGlobe(mount) {
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    50,
    mount.clientWidth / Math.max(mount.clientHeight, 1),
    0.1,
    2000
  );
  camera.position.z = 300;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  mount.appendChild(renderer.domElement);

  const GLOBE_RADIUS = 100;
  const CLOUDS_ALT = 0.004;
  const CLOUDS_ROTATION_SPEED = -0.006; // degrees per frame

  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');

  const globeMaterial = new THREE.MeshPhongMaterial({
    map: loader.load(config.earthDayTexture),
    bumpMap: loader.load(config.earthBumpTexture),
    bumpScale: 6,
    shininess: 8,
    specular: new THREE.Color(0x222222),
  });

  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(GLOBE_RADIUS, 96, 96),
    globeMaterial
  );
  scene.add(globe);

  // Clouds shell, rotating slightly against the globe.
  let clouds = null;
  loader.load(config.cloudsTexture, (cloudsTexture) => {
    clouds = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS * (1 + CLOUDS_ALT), 75, 75),
      new THREE.MeshPhongMaterial({ map: cloudsTexture, transparent: true })
    );
    scene.add(clouds);
  });

  // Atmospheric rim light.
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(GLOBE_RADIUS * 1.08, 96, 96),
    new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(0.3, 0.6, 1.0, 0.55) * intensity;
        }
      `,
    })
  );
  scene.add(atmosphere);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(1, 0.6, 1).multiplyScalar(500);
  scene.add(sun);

  // Background stars.
  const starVertices = [];
  for (let i = 0; i < 1500; i++) {
    const x = (Math.random() - 0.5) * 2000;
    const y = (Math.random() - 0.5) * 2000;
    const z = (Math.random() - 0.5) * 2000;
    if (Math.sqrt(x * x + y * y + z * z) > 500) starVertices.push(x, y, z);
  }
  const starsGeometry = new THREE.BufferGeometry();
  starsGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(starVertices, 3)
  );
  scene.add(
    new THREE.Points(
      starsGeometry,
      new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, transparent: true })
    )
  );

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 150;
  controls.maxDistance = 600;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.35;

  function handleResize() {
    const width = mount.clientWidth || window.innerWidth;
    const height = mount.clientHeight || window.innerHeight * 0.8;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
  window.addEventListener('resize', handleResize);
  handleResize();

  // Double-clicking the globe jumps to the nearby-demands map, as before.
  mount.addEventListener('dblclick', () => {
    const target = document.getElementById('nearby-map');
    (target || document.body).scrollIntoView({ behavior: 'smooth' });
  });

  let running = true;
  function animate() {
    if (!running) return;
    requestAnimationFrame(animate);

    if (clouds) {
      clouds.rotation.y += (CLOUDS_ROTATION_SPEED * Math.PI) / 180;
    }

    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  // Stop rendering while the globe is off-screen.
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !running) {
          running = true;
          animate();
        } else if (!entry.isIntersecting) {
          running = false;
        }
      });
    },
    { threshold: 0.01 }
  );
  observer.observe(mount);
}

/* ------------------------------------------------------- nearby demands --- */

const DEFAULT_RADIUS = 5000;

function demandInfoHtml(demand) {
  return (
    '<div class="p-3 text-gray-800" style="max-width:260px">' +
    '<a href="/viewrequest?id=' +
    encodeURIComponent(demand._id) +
    '" class="text-blue-600 hover:underline">' +
    '<h3 class="text-lg font-bold">' +
    escapeHtml(demand.title) +
    '</h3></a>' +
    '<p class="text-sm text-gray-700 mb-2 leading-relaxed">' +
    escapeHtml(demand.description) +
    '</p>' +
    '<p class="text-xs text-gray-500 mt-2"><strong>Category:</strong> ' +
    escapeHtml(window.CI.titleCase(demand.category)) +
    '</p>' +
    '<p class="text-xs text-gray-500"><strong>Upvotes:</strong> ' +
    escapeHtml(demand.up_votes) +
    (demand.distance != null
      ? ' | <strong>Distance:</strong> ' +
        Math.round(demand.distance) +
        ' m'
      : '') +
    '</p>' +
    '<p class="text-xs text-gray-500 mt-2">Click the title to view details</p>' +
    '</div>'
  );
}

async function initNearbyMap() {
  const statusEl = document.getElementById('nearby-status');
  const mapEl = document.getElementById('nearby-map');
  const countEl = document.getElementById('nearby-count');
  if (!mapEl) return;

  function fail(message) {
    statusEl.innerHTML =
      '<p class="text-red-400 py-8">' + escapeHtml(message) + '</p>';
  }

  if (!config.mapsEnabled) {
    fail(
      'Map preview is unavailable: set GOOGLE_MAPS_API_KEY in the .env file to enable it.'
    );
    return;
  }

  let maps;
  try {
    maps = await window.CI.loadGoogleMaps(['places']);
  } catch (error) {
    fail('Failed to load Google Maps.');
    return;
  }

  function render(center, demands, scoped) {
    statusEl.remove();
    mapEl.classList.remove('hidden');

    const map = new maps.Map(mapEl, {
      center: center,
      zoom: scoped ? 14 : 5,
      mapTypeControl: false,
      streetViewControl: false,
    });

    const infoWindow = new maps.InfoWindow();

    if (scoped) {
      const youMarker = new maps.Marker({
        position: center,
        map: map,
        icon: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
        title: 'Your location',
      });
      youMarker.addListener('click', () => {
        infoWindow.setContent(
          '<div class="p-3 text-gray-800">' +
            '<h3 class="text-lg font-bold text-blue-900">Your Location</h3>' +
            '<p class="text-sm">Latitude: ' +
            center.lat.toFixed(4) +
            '&deg;</p><p class="text-sm">Longitude: ' +
            center.lng.toFixed(4) +
            '&deg;</p></div>'
        );
        infoWindow.open({ anchor: youMarker, map: map });
      });
    }

    demands.forEach((demand) => {
      const coords = demand.location && demand.location.coordinates;
      if (!coords) return;

      const marker = new maps.Marker({
        position: { lat: coords[1], lng: coords[0] },
        map: map,
        icon: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
        title: demand.title,
      });

      marker.addListener('click', () => {
        infoWindow.setContent(demandInfoHtml(demand));
        infoWindow.open({ anchor: marker, map: map });
      });
    });

    const plural = demands.length === 1 ? '' : 's';
    if (!demands.length) {
      countEl.textContent = scoped
        ? 'No demands pinned nearby yet — be the first to raise one.'
        : 'No demands pinned yet — be the first to raise one.';
    } else if (scoped) {
      countEl.textContent =
        demands.length +
        ' demand' +
        plural +
        ' within ' +
        DEFAULT_RADIUS / 1000 +
        ' km of you';
    } else {
      countEl.textContent =
        'Showing all ' + demands.length + ' demand' + plural;
    }
    countEl.classList.remove('hidden');
  }

  async function loadNearby(center) {
    try {
      const demands = await api.get(
        config.urls.demands +
          'nearby?latitude=' +
          center.lat +
          '&longitude=' +
          center.lng +
          '&radius=' +
          DEFAULT_RADIUS
      );
      render(center, demands, true);
    } catch (error) {
      fail('Failed to load nearby demands.');
    }
  }

  async function loadAll() {
    try {
      const demands = await api.get(config.urls.demands + 'getDemand');
      render(config.defaultCenter, demands, false);
    } catch (error) {
      fail('Failed to load demands.');
    }
  }

  if (!navigator.geolocation) {
    toast.info('Geolocation is not supported by your browser.');
    loadAll();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      loadNearby({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    },
    () => {
      // Permission denied or unavailable: fall back to the whole country.
      toast.info('Location access denied — showing all demands instead.');
      loadAll();
    },
    { timeout: 10000 }
  );
}

/* ------------------------------------------------------------- bootstrap -- */

const globeMount = document.getElementById('globeViz');
if (globeMount) {
  try {
    initGlobe(globeMount);
  } catch (error) {
    console.error('Could not start the globe:', error);
    globeMount.style.background =
      'radial-gradient(circle at 50% 50%, #0b2545 0%, #000 70%)';
  }
}

initNearbyMap();
