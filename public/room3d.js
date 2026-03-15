/* ================================================================
   room3d.js — Three.js 3D Room Viewer
   รองรับ: Tile Pattern + Grout Color
   ================================================================ */

let scene, camera, renderer, controls;
let floor, wall1, wall2;
let currentTextureUrl = null;
let currentPattern    = 'straight';
let currentGroutColor = '#d4cfc8';

const TILE_PX  = 256;
const GROUT_PX = 8;
const CANVAS_N = 4; // วาด 4×4 tiles ต่อ canvas

/* ── INIT ── */
window.addEventListener("DOMContentLoaded", () => {
  init();
});

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f172a);

  const viewer = document.getElementById("viewer");

  camera = new THREE.PerspectiveCamera(
    55,
    viewer.clientWidth / viewer.clientHeight,
    0.1,
    1000
  );
  camera.position.set(7, 5, 7);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.setSize(viewer.clientWidth, viewer.clientHeight);
  viewer.appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping  = true;
  controls.dampingFactor  = 0.08;
  controls.minDistance    = 3;
  controls.maxDistance    = 20;
  controls.maxPolarAngle  = Math.PI / 2.1;

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff5e4, 0.5);
  sun.position.set(5, 10, 5);
  sun.castShadow = true;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0xe8f0ff, 0.4);
  fill.position.set(-5, 3, -5);
  scene.add(fill);

  createRoom();
  animate();

  window.addEventListener("resize", onResize);
}

function onResize() {
  const viewer = document.getElementById("viewer");
  if (!viewer) return;
  camera.aspect = viewer.clientWidth / viewer.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(viewer.clientWidth, viewer.clientHeight);
}

/* ── ROOM ── */
function createRoom() {
  const wallMat  = new THREE.MeshStandardMaterial({ color: 0xf8f5f0 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });

  const floorGeo = new THREE.PlaneGeometry(10, 10);
  floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  wall1 = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), wallMat.clone());
  wall1.position.set(0, 2.5, -5);
  scene.add(wall1);

  wall2 = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), wallMat.clone());
  wall2.rotation.y = Math.PI / 2;
  wall2.position.set(-5, 2.5, 0);
  scene.add(wall2);

  const ceilMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const ceil    = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 5;
  scene.add(ceil);
}

/* ── BUILD PATTERN CANVAS ── */
function buildPatternCanvas(img, pattern, groutColor) {
  const T = TILE_PX, G = GROUT_PX, S = T + G;
  const N = CANVAS_N;

  const canvas = document.createElement("canvas");
  canvas.width  = N * S;
  canvas.height = N * S;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = groutColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (pattern === "diagonal") {
    return buildDiagonalCanvas(img, groutColor, canvas.width);
  }

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const baseY = r * S;
      const baseX = c * S;

      if (pattern === "straight") {
        ctx.drawImage(img, baseX, baseY, T, T);

      } else if (pattern === "brick") {
        const offsetX = (r % 2 === 1) ? S / 2 : 0;
        if (r % 2 === 1 && c === 0) {
          ctx.drawImage(img, baseX - S / 2, baseY, T, T);
        }
        ctx.drawImage(img, baseX + offsetX, baseY, T, T);

      } else if (pattern === "vertical") {
        ctx.save();
        ctx.translate(baseX + T / 2, baseY + T / 2);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(img, -T / 2, -T / 2, T, T);
        ctx.restore();
      }
    }
  }

  return canvas;
}

/* ── DIAGONAL (45°) CANVAS ── */
function buildDiagonalCanvas(img, groutColor, size) {
  const canvas = document.createElement("canvas");
  canvas.width  = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  // tile ที่หมุน 45° จะมีขนาด diagonal = T*√2
  // ใช้ขนาดกระเบื้องเล็กลงนิดเพื่อให้พอดี canvas
  const T   = TILE_PX;
  const G   = Math.round(GROUT_PX * 0.7);           // ร่องเล็กลงนิดเพราะ rotate
  const D   = Math.round(T * Math.SQRT2);            // diagonal ของ tile
  const STEP = D + G;                                // ระยะห่างระหว่าง tile center

  // พื้นหลังสีร่อง
  ctx.fillStyle = groutColor;
  ctx.fillRect(0, 0, size, size);

  // วาด tile หมุน 45° ใน diamond grid
  // grid แบบ diamond: (col + row*0.5)*STEP, row * (STEP/2)
  const rows = Math.ceil(size / (STEP / 2)) + 2;
  const cols = Math.ceil(size / STEP) + 2;

  for (let r = -1; r < rows; r++) {
    for (let c = -1; c < cols; c++) {
      // diamond grid offset
      const cx = (c + (r % 2 === 0 ? 0 : 0.5)) * STEP;
      const cy = r * (STEP / 2);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.PI / 4);          // หมุน 45°
      ctx.drawImage(img, -T / 2, -T / 2, T, T);
      ctx.restore();
    }
  }

  return canvas;
}

/* ── APPLY TEXTURE ── */
window.applyTexture = function (url) {
  if (!url) return;
  currentTextureUrl = url;
  reloadTexture();
};

function reloadTexture() {
  if (!currentTextureUrl) return;

  const sizeEl     = document.getElementById("sizeGroup");
  const activePill = sizeEl ? sizeEl.querySelector(".pill.active") : null;
  const size       = activePill ? activePill.dataset.size : "60x60";

  const repeatMap = {
    "30x30":  [5, 5],
    "60x60":  [4, 4],
    "60x120": [4, 2],
    "80x80":  [3, 3],
  };
  const [repS, repT] = repeatMap[size] || [4, 4];

  const img = new Image();
  img.crossOrigin = "anonymous";

  img.onload = () => {
    const patternCanvas = buildPatternCanvas(img, currentPattern, currentGroutColor);

    const texture = new THREE.CanvasTexture(patternCanvas);
    texture.wrapS    = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repS, repT);
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    floor.material.map         = texture;
    floor.material.color.set(0xffffff);
    floor.material.needsUpdate = true;
  };

  img.src = currentTextureUrl;
}

/* ── EXPORT: เรียกจาก generator.html ── */
window.updateZoom = function () {
  reloadTexture();
};

window.setPattern = function (pattern) {
  currentPattern = pattern;
  reloadTexture();
};

window.setGroutColor = function (color) {
  currentGroutColor = color;
  reloadTexture();
};

/* ── ANIMATE ── */
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}