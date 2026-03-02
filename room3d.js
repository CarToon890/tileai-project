let scene, camera, renderer, controls;
let floor, wall1, wall2, wall3, wall4;
let zoom = 1;

/* ================= PRICE CONFIG ================= */

const basePrices = {
  "30x30": 70,
  "60x60": 120,
  "60x120": 220,
  "80x80": 180
};

const areaPerTile = {
  "30x30": 0.09,
  "60x60": 0.36,
  "60x120": 0.72,
  "80x80": 0.64
};

/* ================= INIT ================= */

window.addEventListener("DOMContentLoaded", () => {
  init();
  updateSummary();
  attachEvents();
});

function init() {

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);

  const viewer = document.getElementById("viewer");

  camera = new THREE.PerspectiveCamera(
    60,
    viewer.clientWidth / viewer.clientHeight,
    0.1,
    1000
  );
  camera.position.set(6, 5, 6);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(viewer.clientWidth, viewer.clientHeight);
  viewer.appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
  scene.add(light);

  createRoom();
  animate();

  window.addEventListener("resize", onResize);
}

function onResize() {
  const viewer = document.getElementById("viewer");
  camera.aspect = viewer.clientWidth / viewer.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(viewer.clientWidth, viewer.clientHeight);
}

/* ================= ROOM ================= */

function createRoom() {

  const material = new THREE.MeshStandardMaterial({ color: 0xffffff });

  const floorGeo = new THREE.PlaneGeometry(10, 10);
  floor = new THREE.Mesh(floorGeo, material.clone());
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const wallGeo = new THREE.PlaneGeometry(10, 5);

  wall1 = new THREE.Mesh(wallGeo, material.clone());
  wall1.position.set(0, 2.5, -5);
  scene.add(wall1);

  wall2 = wall1.clone();
  wall2.rotation.y = Math.PI / 2;
  wall2.position.set(-5, 2.5, 0);
  scene.add(wall2);

  wall3 = wall1.clone();
  wall3.rotation.y = Math.PI;
  wall3.position.set(0, 2.5, 5);
  scene.add(wall3);

  wall4 = wall1.clone();
  wall4.rotation.y = -Math.PI / 2;
  wall4.position.set(5, 2.5, 0);
  scene.add(wall4);
}

/* ================= APPLY TEXTURE ================= */

window.applyTexture = function (url) {

  if (!url) return;

  const loader = new THREE.TextureLoader();

  loader.load(url, (texture) => {

    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4 * zoom, 4 * zoom);

    [floor, wall1, wall2, wall3, wall4].forEach(mesh => {
      mesh.material.map = texture;
      mesh.material.needsUpdate = true;
    });

  });
};

/* ================= ANIMATION ================= */

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

/* ================= PRICE ================= */

function calculatePrice() {

  const tileSize = document.getElementById("tileSize")?.value;
  const dpi = document.getElementById("dpi")?.value;

  let base = basePrices[tileSize] || 0;

  if (dpi === "600") base *= 1.2;
  if (dpi === "150") base *= 0.9;

  return Math.round(base);
}

function calculateProduction() {

  const tileSize = document.getElementById("tileSize")?.value;
  const area = areaPerTile[tileSize];

  if (!area) return 0;

  return Math.ceil(100 / area);
}

function updateSummary() {

  const price = calculatePrice();
  const minTiles = calculateProduction();

  document.getElementById("pricePerTile").innerText = price;
  document.getElementById("minTiles").innerText = minTiles;
  document.getElementById("totalCost").innerText = price * minTiles;
}

/* ================= EVENTS ================= */

function attachEvents() {

  document.addEventListener("input", function (e) {

    if (e.target.id === "zoomControl") {

      zoom = parseFloat(e.target.value);

      if (floor?.material?.map) {
        floor.material.map.repeat.set(4 * zoom, 4 * zoom);

        [wall1, wall2, wall3, wall4].forEach(mesh => {
          mesh.material.map.repeat.set(4 * zoom, 4 * zoom);
        });
      }
    }

    if (e.target.id === "tileSize" || e.target.id === "dpi") {
      updateSummary();
    }
  });
}