import * as THREE from "three";
import { OBJLoader } from "./assets/baoenmodel/OBJLoader.js";

const canvas = document.querySelector("#baoen-model-canvas");
const panel = document.querySelector(".baoenModelPanel");
const status = document.querySelector("#baoen-model-status");

if (canvas && panel) {
  if (location.protocol === "file:") {
    setStatus("Run through a local server or GitHub Pages to load the 3D OBJ.");
  } else {
    initBaoenModel();
  }
}

function initBaoenModel() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 5000);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
    powerPreference: "high-performance"
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  scene.add(new THREE.AmbientLight(0xf5ead6, 1.45));

  const hemi = new THREE.HemisphereLight(0xf1e7d2, 0x070605, 1.1);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffefd2, 1.8);
  key.position.set(4, 9, 8);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x5a83b5, 1.0);
  rim.position.set(-5, 4, -7);
  scene.add(rim);

  const glow = new THREE.PointLight(0xf0c985, 2.2, 70, 2);
  glow.position.set(0, 8, 6);
  scene.add(glow);

  const root = new THREE.Group();
  scene.add(root);

  const rings = [];
  let model = null;
  let metrics = null;
  const clock = new THREE.Clock();

  new OBJLoader().load(
    "assets/baoenmodel/model.obj",
    (obj) => {
      model = obj;
      let meshCount = 0;
      obj.traverse((child) => {
        if (!child.isMesh) {
          return;
        }

        meshCount += 1;
        child.visible = true;
        child.frustumCulled = false;
        if (!child.geometry.attributes.normal) {
          child.geometry.computeVertexNormals();
        }
        child.geometry.computeBoundingBox();
        child.geometry.computeBoundingSphere();

        child.material = new THREE.MeshBasicMaterial({
          color: 0xb8a086,
          side: THREE.DoubleSide
        });
      });

      normalizeObject(obj);
      root.add(obj);
      buildOrbitRings();
      window.__baoenModelDebug = {
        meshCount,
        metrics: metrics && {
          size: metrics.size.toArray(),
          center: metrics.center.toArray()
        }
      };
      setStatus("");
      animate();
    },
    undefined,
    () => setStatus("3D model failed to load.")
  );

  const observer = new ResizeObserver(resize);
  observer.observe(panel);
  resize();

  function normalizeObject(obj) {
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = 18 / Math.max(size.y, 1);

    obj.position.sub(center);
    obj.scale.setScalar(scale);
    obj.updateMatrixWorld(true);

    const fittedBox = new THREE.Box3().setFromObject(obj);
    const fittedCenter = fittedBox.getCenter(new THREE.Vector3());
    obj.position.x -= fittedCenter.x;
    obj.position.y -= fittedCenter.y;
    obj.position.z -= fittedCenter.z;
    obj.updateMatrixWorld(true);

    const finalBox = new THREE.Box3().setFromObject(obj);
    metrics = {
      box: finalBox,
      size: finalBox.getSize(new THREE.Vector3()),
      center: finalBox.getCenter(new THREE.Vector3())
    };

    root.scale.setScalar(1.28);
    root.rotation.set(THREE.MathUtils.degToRad(-5), THREE.MathUtils.degToRad(-10), 0);
    frameModel();
  }

  function frameModel() {
    if (!metrics) {
      return;
    }

    const { size, center } = metrics;
    const height = Math.max(size.y, 1);
    const width = Math.max(size.x, 1);
    const aspect = panel.clientWidth / Math.max(panel.clientHeight, 1);
    const halfFov = THREE.MathUtils.degToRad(camera.fov * 0.5);
    const fitHeight = height * 0.5 / Math.tan(halfFov);
    const fitWidth = width * 0.5 / (Math.tan(halfFov) * aspect);
    const distance = Math.max(fitHeight, fitWidth) * 0.78;

    camera.position.set(width * 0.02, center.y + height * 0.03, distance);
    camera.near = Math.max(0.1, distance / 80);
    camera.far = distance * 20;
    camera.lookAt(center.x, center.y + height * 0.03, center.z);
    camera.updateProjectionMatrix();
  }

  function buildOrbitRings() {
    if (!metrics) {
      return;
    }

    const colors = [0xb45b43, 0x3fbf6f, 0x7c5cff, 0x6f8a8f, 0x8f7a49];
    const { box, size } = metrics;
    const radius = Math.max(size.x, size.z) * 0.5;

    colors.forEach((color, index) => {
      const y = THREE.MathUtils.lerp(box.min.y, box.max.y, 0.14 + index * 0.18);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, radius * 0.055, 16, 96),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.18
        })
      );

      ring.position.y = y;
      ring.rotation.x = Math.PI / 2;
      ring.rotation.z = index * 0.38;
      root.add(ring);
      rings.push(ring);
    });
  }

  function resize() {
    const width = Math.max(panel.clientWidth, 1);
    const height = Math.max(panel.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    frameModel();
  }

  function animate() {
    requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();
    window.__baoenRenderCount = (window.__baoenRenderCount || 0) + 1;

    if (model) {
      root.rotation.y = THREE.MathUtils.degToRad(-10) + Math.sin(elapsed * 0.28) * 0.08;
      root.rotation.x = THREE.MathUtils.degToRad(-5) + Math.sin(elapsed * 0.22) * 0.025;
      rings.forEach((ring, index) => {
        ring.rotation.z += 0.002 + index * 0.0006;
        ring.material.opacity = 0.14 + Math.sin(elapsed * 0.8 + index) * 0.035;
      });
    }

    renderer.render(scene, camera);
  }
}

function setStatus(message) {
  if (!status) {
    return;
  }

  status.textContent = message;
  status.classList.toggle("is-hidden", !message);
}
