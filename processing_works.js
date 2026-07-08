(function () {
  const codeBlock = document.querySelector("[data-code-src]");
  if (codeBlock) {
    fetch(codeBlock.dataset.codeSrc)
      .then((response) => response.text())
      .then((text) => {
        codeBlock.textContent = text;
      })
      .catch(() => {
        codeBlock.textContent = "Unable to load Processing source. Open this page through http://localhost:8000/processing_works.html.";
      });
  }

  const track = document.getElementById("readingTrack");
  const slider = document.getElementById("readingSlider");
  if (track && slider) {
    let syncing = false;
    slider.addEventListener("input", () => {
      const maxScroll = track.scrollWidth - track.clientWidth;
      track.scrollLeft = maxScroll * (Number(slider.value) / 100);
    });
    track.addEventListener("scroll", () => {
      if (syncing) return;
      syncing = true;
      window.requestAnimationFrame(() => {
        const maxScroll = track.scrollWidth - track.clientWidth;
        slider.value = maxScroll > 0 ? String((track.scrollLeft / maxScroll) * 100) : "0";
        syncing = false;
      });
    });
  }
})();

(function () {
  const holder = document.getElementById("face-flora-sketch");
  if (!holder) return;

  const status = document.getElementById("faceFloraStatus");
  const cameraButton = document.getElementById("cameraToggle");
  const soundButton = document.getElementById("soundToggle");
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const video = document.createElement("video");
  const audio = new Audio("data/processing/fairyparty.mp3");

  let width = 640;
  let height = 480;
  let frame = 0;
  let hueA = 210;
  let hueB = 292;
  let stream = null;
  let detector = null;
  let detectorReady = false;
  let detecting = false;
  let cameraReady = false;
  let faceCenter = null;
  let pointer = { x: width * 0.5, y: height * 0.46, inside: false };
  let particles = [];
  let mushrooms = [];
  let crystals = [];
  let orbs = [];
  let sparkles = [];

  canvas.width = width;
  canvas.height = height;
  holder.prepend(canvas);
  video.muted = true;
  video.playsInline = true;
  audio.loop = true;

  function setStatus(text) {
    if (status) status.textContent = text;
  }

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function hsl(h, s, l, a = 1) {
    return `hsla(${h}, ${s}%, ${l}%, ${a})`;
  }

  function resizeCanvasToDisplay() {
    const rect = holder.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const nextWidth = Math.max(320, Math.round(rect.width * ratio));
    const nextHeight = Math.max(240, Math.round(rect.height * ratio));
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;
      width = nextWidth;
      height = nextHeight;
    }
  }

  function initScene() {
    mushrooms = Array.from({ length: 8 }, () => new Mushroom(random(34, width - 34), random(height * 0.62, height - 24), random(24, 54)));
    crystals = Array.from({ length: 8 }, () => new Crystal(random(width), random(height * 0.72, height - 8)));
    orbs = Array.from({ length: 24 }, () => new Orb(random(width), random(height)));
    sparkles = Array.from({ length: 36 }, () => new Sparkle(random(width), random(height)));
  }

  async function loadDetector() {
    if (detectorReady || detector) return true;
    try {
      setStatus("loading web face detector...");
      const vision = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm");
      const fileset = await vision.FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
      detector = await vision.FaceDetector.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite",
          delegate: "CPU"
        },
        runningMode: "VIDEO",
        minDetectionConfidence: 0.45
      });
      detectorReady = true;
      return true;
    } catch (error) {
      console.warn("MediaPipe face detector unavailable; using pointer fallback.", error);
      setStatus("face model could not load; move the cursor over the mirror to guide the flora");
      return false;
    }
  }

  async function startCamera() {
    if (cameraReady) return;
    try {
      cameraButton.textContent = "Starting...";
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
      video.srcObject = stream;
      await video.play();
      cameraReady = true;
      cameraButton.textContent = "Camera On";
      setStatus("camera is active; loading face detection...");
      await loadDetector();
      setStatus(detectorReady ? "face detection is active; move your face to guide the generated flora" : "move the cursor over the mirror to guide the flora");
    } catch (error) {
      cameraButton.textContent = "Start Camera";
      setStatus("camera permission was blocked or unavailable; move the cursor over the mirror to guide the flora");
    }
  }

  function toggleSound() {
    if (audio.paused) {
      audio.play()
        .then(() => {
          soundButton.textContent = "Pause";
        })
        .catch(() => {
          soundButton.textContent = "Sound unavailable";
        });
    } else {
      audio.pause();
      soundButton.textContent = "Sound";
    }
  }

  async function detectFace() {
    if (!detectorReady || detecting || !cameraReady || !video.videoWidth) return;
    detecting = true;
    try {
      const result = detector.detectForVideo(video, performance.now());
      const detection = result.detections && result.detections[0];
      if (!detection) {
        faceCenter = null;
        return;
      }
      const box = detection.boundingBox;
      const sx = width / video.videoWidth;
      const sy = height / video.videoHeight;
      faceCenter = {
        x: width - (box.originX + box.width * 0.5) * sx,
        y: (box.originY + box.height * 0.5) * sy,
        w: box.width * sx,
        h: box.height * sy
      };
    } catch (error) {
      faceCenter = null;
    } finally {
      detecting = false;
    }
  }

  holder.addEventListener("pointermove", (event) => {
    const rect = holder.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    pointer = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
      inside: true
    };
  });

  holder.addEventListener("pointerleave", () => {
    pointer.inside = false;
  });

  cameraButton?.addEventListener("click", startCamera);
  soundButton?.addEventListener("click", toggleSound);

  function drawGradient() {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, hsl(hueA, 74, 64, 1));
    gradient.addColorStop(1, hsl(hueB, 70, 52, 1));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  function drawCamera() {
    if (!cameraReady || !video.videoWidth) return;
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();
  }

  function drawFlowLines() {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = 1;
    for (let i = 0; i < 44; i++) {
      ctx.strokeStyle = hsl((hueA + i * 6) % 360, 88, 72, 0.35);
      ctx.beginPath();
      for (let j = 0; j <= 20; j++) {
        const x = (Math.sin(frame * 0.009 + i * 1.7 + j * 0.52) * 0.5 + 0.5) * width;
        const y = (Math.cos(frame * 0.007 + i * 1.13 + j * 0.41) * 0.5 + 0.5) * height;
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBranches() {
    ctx.save();
    ctx.strokeStyle = hsl(90, 34, 32, 0.26);
    ctx.lineWidth = Math.max(1, width / 640);
    branch(0, height, width * 0.12, -Math.PI * 0.35, 5);
    branch(width, height, width * 0.12, -Math.PI * 0.65, 5);
    branch(0, 0, width * 0.08, Math.PI * 0.22, 4);
    branch(width, 0, width * 0.08, Math.PI * 0.78, 4);
    ctx.restore();
  }

  function branch(x, y, len, angle, depth) {
    if (depth <= 0 || len < 4) return;
    const ex = x + Math.cos(angle) * len;
    const ey = y + Math.sin(angle) * len;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    branch(ex, ey, len * 0.68, angle - 0.46, depth - 1);
    branch(ex, ey, len * 0.64, angle + 0.38, depth - 1);
  }

  function activeTarget() {
    if (faceCenter) return faceCenter;
    if (cameraReady || pointer.inside) {
      return {
        x: pointer.inside ? pointer.x : width * 0.5,
        y: pointer.inside ? pointer.y : height * 0.46,
        w: width * 0.25,
        h: height * 0.34
      };
    }
    return null;
  }

  function drawFaceTarget(target) {
    if (!target) return;
    ctx.save();
    ctx.strokeStyle = hsl(122, 75, 75, 0.55);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(target.x, target.y, target.w * 0.5, target.h * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  class OrbitThing {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.phase = random(0, Math.PI * 2);
      this.angle = random(0, Math.PI * 2);
      this.radius = random(width * 0.13, width * 0.36);
      this.speed = random(-0.025, 0.025) || 0.012;
    }

    orbit(target, flatten = 1) {
      if (!target) return false;
      this.angle += this.speed;
      this.x = target.x + Math.cos(this.angle) * this.radius;
      this.y = target.y + Math.sin(this.angle) * this.radius * flatten;
      return true;
    }
  }

  class Mushroom extends OrbitThing {
    constructor(x, y, size) {
      super(x, y);
      this.size = size;
      this.hue = random(268, 332);
      this.speed = random(0.008, 0.018);
    }

    update(target) {
      if (!this.orbit(target, 0.55)) this.x += Math.sin(frame * 0.012 + this.phase) * 0.3;
    }

    draw() {
      const y = this.y + Math.sin(frame * 0.022 + this.phase) * 3;
      ctx.save();
      ctx.fillStyle = hsl(this.hue, 72, 64, 0.68);
      ctx.beginPath();
      ctx.ellipse(this.x, y, this.size * 0.5, this.size * 0.32, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = hsl(this.hue - 24, 30, 84, 0.68);
      ctx.fillRect(this.x - this.size * 0.08, y, this.size * 0.16, this.size * 0.42);
      ctx.fillStyle = "rgba(255,255,255,.55)";
      ctx.beginPath();
      ctx.arc(this.x - this.size * 0.18, y - this.size * 0.18, this.size * 0.06, 0, Math.PI * 2);
      ctx.arc(this.x + this.size * 0.12, y - this.size * 0.14, this.size * 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  class Crystal {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.h = random(height * 0.06, height * 0.15);
      this.hue = random(178, 252);
      this.phase = random(0, Math.PI * 2);
      this.lean = random(-0.18, 0.18);
    }

    draw() {
      const glow = (Math.sin(frame * 0.032 + this.phase) + 1) * 0.5;
      const tx = this.x + this.lean * this.h;
      ctx.save();
      ctx.fillStyle = hsl(this.hue, 82, 70, 0.52 + glow * 0.18);
      ctx.beginPath();
      ctx.moveTo(tx, this.y - this.h);
      ctx.lineTo(this.x - this.h * 0.22, this.y);
      ctx.lineTo(this.x + this.h * 0.22, this.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = hsl(this.hue + 38, 18, 92, 0.34 + glow * 0.28);
      ctx.beginPath();
      ctx.ellipse(tx, this.y - this.h * 0.5, this.h * 0.08, this.h * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  class Orb extends OrbitThing {
    constructor(x, y) {
      super(x, y);
      this.vx = random(-0.32, 0.32);
      this.vy = random(-0.58, -0.08);
      this.size = random(8, 26);
      this.hue = random(148, 322);
    }

    update(target) {
      if (this.orbit(target, 1)) return;
      this.x += this.vx + Math.sin(frame * 0.017 + this.phase) * 0.75;
      this.y += this.vy;
      if (this.y < -this.size * 2) {
        this.y = height + this.size;
        this.x = random(0, width);
      }
      if (this.x < -this.size) this.x = width + this.size;
      if (this.x > width + this.size) this.x = -this.size;
    }

    draw() {
      const pulse = (Math.sin(frame * 0.058 + this.phase) + 1) * 0.5;
      ctx.save();
      ctx.fillStyle = hsl(this.hue, 44, 82, 0.18 + pulse * 0.1);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = hsl(this.hue, 66, 72, 0.5 + pulse * 0.22);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  class Sparkle extends OrbitThing {
    constructor(x, y) {
      super(x, y);
      this.size = random(5, 14);
      this.hue = random(35, 75);
      this.speed = random(0.01, 0.03);
    }

    update(target) {
      if (!this.orbit(target, 0.7) && Math.random() < 0.003) {
        this.x = random(0, width);
        this.y = random(0, height);
      }
    }

    draw() {
      const t = (Math.sin(frame * 0.075 + this.phase) + 1) * 0.5;
      const s = this.size * (0.45 + t * 0.55);
      ctx.save();
      ctx.fillStyle = hsl(this.hue, 55, 88, t * 0.72);
      ctx.fillRect(this.x - s * 0.08, this.y - s, s * 0.16, s * 2);
      ctx.fillRect(this.x - s, this.y - s * 0.08, s * 2, s * 0.16);
      ctx.restore();
    }
  }

  class Particle {
    constructor(x, y, angle) {
      const speed = random(0.6, 3.2);
      this.x = x;
      this.y = y;
      this.vx = Math.cos(angle + random(-0.4, 0.4)) * speed;
      this.vy = Math.sin(angle + random(-0.4, 0.4)) * speed;
      this.maxLife = random(40, 90);
      this.life = this.maxLife;
      this.hue = random(160, 300);
      this.size = random(2, 7);
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += 0.05;
      this.vx *= 0.98;
      this.vy *= 0.98;
      this.life--;
    }

    draw() {
      const progress = Math.max(0, this.life / this.maxLife);
      ctx.save();
      ctx.fillStyle = hsl(this.hue, 70, 72, progress * 0.9);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * progress, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function updateAndDraw(target) {
    crystals.forEach((item) => item.draw());
    mushrooms.forEach((item) => {
      item.update(target);
      item.draw();
    });
    orbs.forEach((item) => {
      item.update(target);
      item.draw();
    });
    sparkles.forEach((item) => {
      item.update(target);
      item.draw();
    });

    if (target) {
      for (let i = 0; i < 8; i++) {
        const angle = random(0, Math.PI * 2);
        particles.push(new Particle(target.x + Math.cos(angle) * target.w * 0.5, target.y + Math.sin(angle) * target.h * 0.5, angle));
      }
    } else if (frame % 18 === 0) {
      particles.push(new Particle(random(0, width), random(0, height), random(0, Math.PI * 2)));
    }

    particles = particles.filter((particle) => {
      particle.update();
      particle.draw();
      return particle.life > 0;
    }).slice(-900);
  }

  function loop() {
    resizeCanvasToDisplay();
    if (frame === 0 || frame % 120 === 0) {
      if (!mushrooms.length) initScene();
    }

    drawGradient();
    drawCamera();
    drawFlowLines();
    drawBranches();

    if (frame % 8 === 0) detectFace();
    const target = activeTarget();
    drawFaceTarget(target);
    updateAndDraw(target);

    hueA = (hueA + 0.05) % 360;
    hueB = (hueB + 0.04) % 360;
    frame++;
    requestAnimationFrame(loop);
  }

  initScene();
  loop();
})();
