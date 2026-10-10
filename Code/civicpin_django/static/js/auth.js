/* Auth page: login/signup toggle, OTP flow, Google Sign-In and the rotating
 * Earth. Ports app/auth/page.jsx, components/login.jsx, components/signup.jsx,
 * components/RotatingEarth.jsx and components/GoogleSignInButton.jsx. */

import * as THREE from 'three';

const { api, toast, config } = window.CI;

/* ------------------------------------------------------- rotating earth -- */

function initEarth(container, textureUrl) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    50,
    container.clientWidth / Math.max(container.clientHeight, 1),
    0.1,
    1000
  );
  camera.position.z = 2.8;

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const geometry = new THREE.SphereGeometry(1, 128, 128);
  const earthTexture = new THREE.TextureLoader().load(textureUrl);

  // Atmospheric rim glow, rendered on the inside of a slightly larger sphere.
  const atmosphereGeometry = new THREE.SphereGeometry(1.02, 128, 128);
  const atmosphereMaterial = new THREE.ShaderMaterial({
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
        float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        gl_FragColor = vec4(0.3, 0.6, 1.0, 0.5) * intensity;
      }
    `,
  });
  const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
  scene.add(atmosphere);

  const material = new THREE.MeshPhongMaterial({
    map: earthTexture,
    shininess: 10,
    specular: new THREE.Color(0x333333),
  });
  const earth = new THREE.Mesh(geometry, material);
  scene.add(earth);

  scene.add(new THREE.AmbientLight(0xffffff, 0.3));
  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.position.set(5, 3, 5);
  scene.add(sun);
  const blueLight = new THREE.PointLight(0x3677ac, 0.8);
  blueLight.position.set(-5, -3, -5);
  scene.add(blueLight);

  // Starfield, keeping stars clear of the globe itself.
  const starVertices = [];
  for (let i = 0; i < 1000; i++) {
    const x = (Math.random() - 0.5) * 20;
    const y = (Math.random() - 0.5) * 20;
    const z = (Math.random() - 0.5) * 20;
    if (Math.sqrt(x * x + y * y + z * z) > 5) starVertices.push(x, y, z);
  }
  const starsGeometry = new THREE.BufferGeometry();
  starsGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(starVertices, 3)
  );
  const stars = new THREE.Points(
    starsGeometry,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.02, transparent: true })
  );
  scene.add(stars);

  let lastTime = 0;
  const rotationSpeed = 0.05;

  function animate(time) {
    const delta = (time - lastTime) / 1000;
    lastTime = time;

    earth.rotation.y += rotationSpeed * delta;
    atmosphere.rotation.y += rotationSpeed * delta;
    stars.rotation.y += 0.0005;

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  function handleResize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
  window.addEventListener('resize', handleResize);
  handleResize();

  requestAnimationFrame(animate);
}

/* ------------------------------------------------------------ form utils -- */

function showError(field, message) {
  const el = document.querySelector('[data-error-for="' + field + '"]');
  if (!el) return;
  el.textContent = message || '';
  el.classList.toggle('hidden', !message);

  const box = el.closest('[data-error-box]');
  if (box) box.classList.toggle('hidden', !message);
}

function clearErrors(scope) {
  scope.querySelectorAll('[data-error-for]').forEach((el) => {
    el.textContent = '';
    el.classList.add('hidden');
  });
  scope.querySelectorAll('[data-error-box]').forEach((el) => {
    el.classList.add('hidden');
  });
}

function setBusy(button, busy, busyLabel) {
  if (!button) return;
  if (busy) {
    button.dataset.idleLabel = button.dataset.idleLabel || button.textContent;
    button.disabled = true;
    button.textContent = busyLabel || 'Please wait...';
  } else {
    button.disabled = false;
    if (button.dataset.idleLabel) button.textContent = button.dataset.idleLabel;
  }
}

const EMAIL_RE = /\S+@\S+\.\S+/;

/* ----------------------------------------------------------- mode toggle -- */

const signupPanel = document.getElementById('signup-panel');
const loginPanel = document.getElementById('login-panel');
const heading = document.getElementById('form-heading');
const togglePrompt = document.getElementById('toggle-prompt');
const toggleButton = document.getElementById('mode-toggle');
const earthPane = document.getElementById('earth-pane');
const photoPicker = document.getElementById('photo-picker');
const loginBlurb = document.getElementById('login-blurb');

let mode = config.initialMode === 'login' ? 'login' : 'signup';

function applyMode() {
  const isLogin = mode === 'login';

  signupPanel.classList.toggle('hidden', isLogin);
  loginPanel.classList.toggle('hidden', !isLogin);
  photoPicker.classList.toggle('hidden', isLogin);
  loginBlurb.classList.toggle('hidden', !isLogin);

  heading.textContent = isLogin ? 'Log In' : 'Create Account';
  togglePrompt.textContent = isLogin
    ? "Don't have an account?"
    : 'Already have an account?';
  toggleButton.textContent = isLogin ? 'Sign Up' : 'Log In';

  // The earth pane swaps sides between the two modes, as in the original.
  earthPane.classList.toggle('md:order-last', isLogin);
  earthPane.classList.toggle('md:rounded-r-3xl', isLogin);
  earthPane.classList.toggle('md:rounded-l-3xl', !isLogin);

  const url = new URL(window.location.href);
  url.searchParams.set('mode', mode);
  window.history.replaceState({}, '', url);

  if (isLogin) renderGoogleButton('google-button-login');
  else renderGoogleButton('google-button-signup');
}

toggleButton.addEventListener('click', () => {
  mode = mode === 'login' ? 'signup' : 'login';
  applyMode();
});

/* ------------------------------------------------------- profile picture -- */

const photoInput = document.getElementById('profile-photo');
const photoTrigger = document.getElementById('photo-trigger');
const photoPreview = document.getElementById('photo-preview');
const photoPlaceholder = document.getElementById('photo-placeholder');
let profilePhotoFile = null;

photoTrigger.addEventListener('click', () => photoInput.click());

photoInput.addEventListener('change', (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  profilePhotoFile = file;
  const reader = new FileReader();
  reader.onloadend = () => {
    photoPreview.src = reader.result;
    photoPreview.classList.remove('hidden');
    photoPlaceholder.classList.add('hidden');
  };
  reader.readAsDataURL(file);
});

/* ------------------------------------------------------------- OTP flow -- */

const emailInput = document.getElementById('signup-email');
const otpBlock = document.getElementById('otp-block');
const otpInput = document.getElementById('signup-otp');
const verifiedNote = document.getElementById('email-verified');
const sendOtpButton = document.getElementById('send-otp');
const verifyOtpButton = document.getElementById('verify-otp');

let emailVerified = false;

sendOtpButton.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  showError('email', '');

  if (!email) {
    showError('email', 'Email is required');
    return;
  }
  if (!EMAIL_RE.test(email)) {
    showError('email', 'Email is invalid');
    return;
  }

  setBusy(sendOtpButton, true, 'Sending...');
  try {
    const data = await api.post(config.urls.auth + 'sendOTP', { email });
    toast.success(data.message || 'OTP sent successfully');
    otpBlock.classList.remove('hidden');
    showError('otp', '');
    otpInput.focus();
  } catch (error) {
    showError('email', error.message || 'Failed to send OTP');
  } finally {
    setBusy(sendOtpButton, false);
  }
});

verifyOtpButton.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const otp = otpInput.value.trim();
  showError('otp', '');

  if (!otp) {
    showError('otp', 'OTP is required');
    return;
  }

  setBusy(verifyOtpButton, true, 'Verifying...');
  try {
    const data = await api.post(config.urls.auth + 'verifyOTP', { email, otp });
    if (data.verified) {
      emailVerified = true;
      otpBlock.classList.add('hidden');
      verifiedNote.classList.remove('hidden');
      toast.success('OTP verified successfully');
    } else {
      showError('otp', data.error || 'OTP verification failed');
    }
  } catch (error) {
    showError('otp', error.message || 'OTP verification failed');
  } finally {
    setBusy(verifyOtpButton, false);
  }
});

// A changed address invalidates a previous verification.
emailInput.addEventListener('input', () => {
  if (!emailVerified) return;
  emailVerified = false;
  verifiedNote.classList.add('hidden');
});

/* --------------------------------------------------------------- signup -- */

const signupForm = document.getElementById('signup-form');
const signupSubmit = document.getElementById('signup-submit');

function validateSignup() {
  const errors = {};
  const name = document.getElementById('signup-name').value.trim();
  const email = emailInput.value.trim();
  const password = document.getElementById('signup-password').value;
  const confirmPassword = document.getElementById('signup-confirm').value;
  const agreeTerms = document.getElementById('signup-terms').checked;

  if (!name) errors.name = 'Name is required';
  if (!email) errors.email = 'Email is required';
  else if (!EMAIL_RE.test(email)) errors.email = 'Email is invalid';

  if (!password) errors.password = 'Password is required';
  else if (password.length < 6)
    errors.password = 'Password must be at least 6 characters';

  if (password !== confirmPassword)
    errors.confirmPassword = 'Passwords do not match';

  if (!agreeTerms)
    errors.agreeTerms = 'You must agree to the Terms and Conditions';

  return errors;
}

signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearErrors(signupPanel);

  const errors = validateSignup();
  if (Object.keys(errors).length) {
    Object.entries(errors).forEach(([field, message]) =>
      showError(field, message)
    );
    return;
  }

  if (!emailVerified) {
    toast.error('Please verify your email with the OTP');
    otpBlock.classList.remove('hidden');
    showError('otp', 'Please verify your email with the OTP');
    return;
  }

  const payload = new FormData();
  payload.append('name', document.getElementById('signup-name').value.trim());
  payload.append('email', emailInput.value.trim());
  payload.append('password', document.getElementById('signup-password').value);
  payload.append('phone', document.getElementById('signup-phone').value.trim());
  payload.append(
    'address',
    document.getElementById('signup-address').value.trim()
  );
  payload.append('gender', document.getElementById('signup-gender').value);
  payload.append('age', document.getElementById('signup-age').value);
  if (profilePhotoFile) payload.append('profilePhoto', profilePhotoFile);

  setBusy(signupSubmit, true, 'Creating Account...');
  try {
    await api.post(config.urls.auth + 'signup', payload);
    toast.success('Registration successful! Redirecting to login...');
    mode = 'login';
    applyMode();
    document.getElementById('login-email').value = emailInput.value.trim();
  } catch (error) {
    showError('submit', error.message || 'Failed to register. Please try again.');
  } finally {
    setBusy(signupSubmit, false);
  }
});

/* ---------------------------------------------------------------- login -- */

const loginForm = document.getElementById('login-form');
const loginSubmit = document.getElementById('login-submit');

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearErrors(loginPanel);

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  let invalid = false;
  if (!email) {
    showError('login-email', 'Email is required');
    invalid = true;
  } else if (!EMAIL_RE.test(email)) {
    showError('login-email', 'Email is invalid');
    invalid = true;
  }
  if (!password) {
    showError('login-password', 'Password is required');
    invalid = true;
  } else if (password.length < 6) {
    showError('login-password', 'Password must be at least 6 characters');
    invalid = true;
  }
  if (invalid) return;

  setBusy(loginSubmit, true, 'Logging in...');
  try {
    const data = await api.post(config.urls.auth + 'login', { email, password });
    if (data && data.success) {
      // The review form pre-fills from this, as the old frontend did.
      try {
        window.localStorage.setItem('email', email);
      } catch (err) {
        /* private mode: not essential */
      }
      toast.success('Login successful! Redirecting to home...');
      window.location.href = '/';
    } else {
      showError('login-submit', 'Failed to login. Please try again.');
    }
  } catch (error) {
    showError('login-submit', error.message || 'Failed to login. Please try again.');
  } finally {
    setBusy(loginSubmit, false);
  }
});

/* ------------------------------------------------------ Google Sign-In --- */

let googleInitialised = false;

async function handleGoogleCredential(response) {
  try {
    const data = await api.post(config.urls.auth + 'google', {
      credential: response.credential,
    });
    if (data && data.success) {
      toast.success('Signed in with Google!');
      window.location.href = '/';
    } else {
      toast.error('Google sign-in failed. Please try again.');
    }
  } catch (error) {
    toast.error(error.message || 'Google sign-in failed. Please try again.');
  }
}

function renderGoogleButton(targetId) {
  if (!config.googleClientId) return;

  const target = document.getElementById(targetId);
  if (!target || !window.google || !window.google.accounts) return;

  if (!googleInitialised) {
    window.google.accounts.id.initialize({
      client_id: config.googleClientId,
      callback: handleGoogleCredential,
    });
    googleInitialised = true;
  }

  target.innerHTML = '';
  window.google.accounts.id.renderButton(target, {
    theme: 'outline',
    size: 'large',
    width: 320,
    text: 'continue_with',
  });
}

if (config.googleClientId) {
  // The GSI script loads async; poll briefly until it is ready.
  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (window.google && window.google.accounts) {
      clearInterval(timer);
      applyMode();
    } else if (attempts > 40) {
      clearInterval(timer);
    }
  }, 150);
}

/* ------------------------------------------------------------- bootstrap -- */

applyMode();

const earthCanvas = document.getElementById('earth-canvas');
const earthLoader = document.getElementById('earth-loader');
if (earthCanvas) {
  try {
    initEarth(earthCanvas, config.earthTexture);
  } catch (error) {
    console.error('Could not start the rotating earth:', error);
    earthCanvas.style.background =
      'radial-gradient(circle at 50% 50%, #0b2545 0%, #000 70%)';
  }
  window.setTimeout(() => {
    earthCanvas.classList.replace('opacity-0', 'opacity-100');
    if (earthLoader) earthLoader.remove();
  }, 600);
}
