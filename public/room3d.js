/* ================================================================
   room3d.js — Three.js 3D Room Viewer
   ราคาจัดการใน generator.html ทั้งหมด ไฟล์นี้รับผิดชอบแค่ 3D
   ================================================================ */

let scene, camera, renderer, controls;
let floor, wall1, wall2, wall3, wall4;
let currentTextureUrl = null;

/* ── INIT ── */
window.addEventListener("DOMContentLoaded", () => {
  init();
  attachEvents();
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

  const fill = new THREE.DirectionalLight(0xe8f0ff, 0.3);
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

  // Floor
  const floorGeo = new THREE.PlaneGeometry(10, 10);
  floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Back wall
  wall1 = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), wallMat.clone());
  wall1.position.set(0, 2.5, -5);
  scene.add(wall1);

  // Left wall
  wall2 = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), wallMat.clone());
  wall2.rotation.y = Math.PI / 2;
  wall2.position.set(-5, 2.5, 0);
  scene.add(wall2);

  // Ceiling hint (light plane)
  const ceilGeo = new THREE.PlaneGeometry(10, 10);
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const ceil    = new THREE.Mesh(ceilGeo, ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 5;
  scene.add(ceil);
}

/* ── APPLY TEXTURE ── */
window.applyTexture = function (url) {
  if (!url) return;
  currentTextureUrl = url;
  reloadTexture();
};

function reloadTexture() {
  if (!currentTextureUrl) return;

  const sizeEl = document.getElementById("sizeGroup");
  const activePill = sizeEl ? sizeEl.querySelector(".pill.active") : null;
  const size   = activePill ? activePill.dataset.size : "60x60";

  // repeatMap: [S, T] — พื้น 10x10m หารด้วยขนาดกระเบื้องจริง
  // 30x30cm  → 10/0.3 ≈ 33 tiles → rep 5
  // 60x60cm  → 10/0.6 ≈ 16 tiles → rep 4
  // 60x120cm → wide 10/0.6=16, deep 10/1.2=8 → [4, 2]
  // 80x80cm  → 10/0.8 ≈ 12 tiles → rep 3
  const repeatMap = {
    "30x30":  [5, 5],
    "60x60":  [4, 4],
    "60x120": [4, 2],
    "80x80":  [3, 3],
  };
  const [repS, repT] = repeatMap[size] || [4, 4];

  const loader = new THREE.TextureLoader();
  loader.load(currentTextureUrl, (texture) => {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repS, repT);
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    // ใส่เฉพาะ floor
    floor.material.map         = texture;
    floor.material.color.set(0xffffff);
    floor.material.needsUpdate = true;
  });
}

/* ── ZOOM (เรียกจาก generator เมื่อเปลี่ยน size) ── */
window.updateZoom = function () {
  reloadTexture();
};

/* ── EVENTS ── */
function attachEvents() {
  // ไม่ต้องจัดการราคาอีกแล้ว ทำหมดใน generator.html
}

/* ── ANIMATE ── */
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}