/**
 *A Magic Mirror of Face Flora
 *During the development of this project, I carried out several rounds of adjustments and optimisations, focusing primarily on visual stability and the overall user experience. 
 *In the initial version, the display suffered from noticeable flickering. 
 *Upon investigation, I discovered that the root cause lay in the fact that the camera feed was only rendered when a new frame was detected, whilst the background was continuously refreshed with every frame; 
 *this resulted in the screen being "cleared" during the gaps between frames.
 *To address this, I introduced a persistent cache (lastFrame) to ensure the camera feed was rendered consistently in every frame, thereby completely eliminating the flickering. 
 *At the same time, I made detailed adjustments to the rendering method for the background gradient, 
 *standardising the previously overlapping 1-pixel rectangular strips into a strictly continuous structure, ensuring smoother transitions during dynamic movement.
 *In terms of colour control, I reorganised the overall rendering logic, centralising the `colorMode` settings—previously scattered across various functions—within the main loop for unified management. 
 *I also employed style isolation to ensure that elements such as the HUD retain their correct colour rendering. 
 *Furthermore, I resolved an issue where the system triggered face detection immediately upon launch, resulting in a more natural and fluid overall performance.
 *On the visual and experiential front, I further expanded the project's expressiveness: background music was added to create a more complete atmospheric environment; 
 *simultaneously, when the system detects a face, particle elements (such as mushrooms, light orbs and starlight) no longer simply spawn randomly, 
 *but instead form orbital movements around the face, rotating dynamically along elliptical paths to enhance the interactive relationship between the user and the system; when the face disappears, 
 *these elements revert to a state of free-floating. The entire process was not only a technical debugging and refinement exercise but also gradually evolved into a continuous refinement of visual rhythm and interactive experience.
 
 
 */

import processing.video.*;
import gab.opencv.*;
import java.awt.Rectangle;
import processing.sound.*;   // 音频库 audio library

Capture     cam;
OpenCV      opencv;
Rectangle[] faces;

// BGM
SoundFile   music;

// 粒子容器（LinkedList 头删 O(1)）
java.util.LinkedList<Particle> particles = new java.util.LinkedList<Particle>();

// 帧控制 frame control
int     detectFrameCounter = 1;      // 从1开始，避免启动瞬间误检测
boolean newFrameReady      = false;
PImage  lastFrame          = null;   // 持久化摄像头画面，消除闪烁 Webcam will last long

// 摄像头 / 检测参数 
static final int   CAM_W                 = 640;
static final int   CAM_H                 = 480;
static final int   DETECT_EVERY_N_FRAMES = 6;
static final int   PARTICLES_PER_FRAME   = 8;
static final int   MAX_PARTICLES         = 1500;
static final float FACE_ALPHA            = 60;
static final float DETECT_SCALE          = 0.5;
static final int   DETECT_W              = (int)(CAM_W * DETECT_SCALE);
static final int   DETECT_H              = (int)(CAM_H * DETECT_SCALE);

//  背景动画变量 
float bgHue1 = 210;   // 顶部色调（初始：青蓝）
float bgHue2 = 270;   // 底部色调（初始：紫粉）
float noiseT = 0;     // Perlin 噪声时间轴

// 当前人脸中心（null = 未检测到人脸） face not detected
PVector faceCenter = null;

// 装饰元素列表 
java.util.ArrayList<Mushroom> mushrooms = new java.util.ArrayList<Mushroom>();
java.util.ArrayList<Crystal>  crystals  = new java.util.ArrayList<Crystal>();
java.util.ArrayList<FloatOrb> orbs      = new java.util.ArrayList<FloatOrb>();
java.util.ArrayList<Sparkle>  sparkles  = new java.util.ArrayList<Sparkle>();

// 预生成树枝（避免每帧调 random 导致抖动）
java.util.ArrayList<float[]> branchList = new java.util.ArrayList<float[]>();

//...New Content...//
void setup() {
  size(640, 480);
  colorMode(HSB, 360, 100, 100, 100);  // 全局 colorMode，setup 里设定一次 This is the generic setting
  frameRate(30);

  // 加载并循环播放背景音乐
  music = new SoundFile(this, "fairyparty.mp3");
  music.loop();

  // 摄像头初始化
  String[] cams = Capture.list();
  if (cams.length == 0) { println("未检测到摄像头"); exit(); return; }
  cam = new Capture(this, CAM_W, CAM_H);
  cam.start();

  // OpenCV 半分辨率初始化，减少检测耗时
  opencv = new OpenCV(this, DETECT_W, DETECT_H);
  opencv.loadCascade(OpenCV.CASCADE_FRONTALFACE);

  // 初始化装饰元素 initialising decks
  for (int i = 0; i < 7; i++)
    mushrooms.add(new Mushroom(random(20, width-20), random(height*0.62, height-8), random(18, 46)));

  for (int i = 0; i < 6; i++)
    crystals.add(new Crystal(random(width), random(height*0.68, height-4)));

  for (int i = 0; i < 16; i++)
    orbs.add(new FloatOrb(random(width), random(height)));

  for (int i = 0; i < 22; i++)
    sparkles.add(new Sparkle(random(width), random(height)));

  // 预生成四角树枝（固定随机种子，保证形态稳定）
  randomSeed(42);
  genBranch(  0,      height, 72, -PI*0.35, 5);   // 左下
  genBranch(width,    height, 72, -PI*0.65, 5);   // 右下
  genBranch(  0,         0,  52,  PI*0.22,  4);   // 左上
  genBranch(width,       0,  52,  PI*0.78,  4);   // 右上
  randomSeed((int)millis());                       // 恢复随机
}

// 递归预生成树枝数据 
void genBranch(float x, float y, float len, float angle, int depth) {
  if (depth <= 0 || len < 5) return;
  float ex = x + cos(angle) * len;
  float ey = y + sin(angle) * len;
  branchList.add(new float[]{x, y, ex, ey, depth});
  genBranch(ex, ey, len * 0.68, angle - random(0.32, 0.62), depth - 1);
  genBranch(ex, ey, len * 0.63, angle + random(0.26, 0.56), depth - 1);
}

//...New...//
// FIX #1: captureEvent 里保存一份持久化副本
void captureEvent(Capture c) {
  c.read();
  lastFrame     = c.copy();   // 存下当前帧，draw() 始终可用
  newFrameReady = true;
}

//...New...//
void draw() {
  // FIX content: 只在 draw() 开头设置一次 HSB，子函数不再重复设置
  colorMode(HSB, 360, 100, 100, 100);

  // 根据上一帧的检测结果更新人脸中心（供装饰元素使用）
  if (faces != null && faces.length > 0) {
    Rectangle face = faces[0];
    float cx = (width - face.x - face.width) + face.width / 2.0;
    float cy = face.y + face.height / 2.0;
    faceCenter = new PVector(cx, cy);
  } else {
    faceCenter = null;
  }

  // ① 绘制纯实色渐变背景（完全不透明，稳定底层）
  drawGradientBackground();

  // ② FIX #1: 始终绘制最后一帧摄像头画面（镜像），不再受 newFrameReady 控制
  if (lastFrame != null) {
    pushMatrix();
      scale(-1, 1);
      translate(-width, 0);
      tint(0, 0, 100, 48);   // HSB 白色 48% 透明度，保留肤色自然
      image(lastFrame, 0, 0);
      noTint();
    popMatrix();
  }

  // ③ Perlin 流动有机线条
  drawFlowingLines();

  // ④ 装饰元素（从后往前：树枝 → 水晶 → 蘑菇 → 光球 → 星光）
  drawBranches();
  for (Crystal  c : crystals)  c.display();
  for (Mushroom m : mushrooms) { m.update(); m.display(); }
  for (FloatOrb o : orbs)      { o.update(); o.display(); }
  for (Sparkle  s : sparkles)  { s.update(); s.display(); }

  // ⑤ 人脸检测（限流：每 DETECT_EVERY_N_FRAMES 帧一次）
  if (newFrameReady) {
    newFrameReady = false;
    detectFrameCounter++;
    if (detectFrameCounter % DETECT_EVERY_N_FRAMES == 0) {
      PImage small = lastFrame.copy();   // 用已保存的副本，避免并发问题
      small.resize(DETECT_W, DETECT_H);
      opencv.loadImage(small);
      faces = opencv.detect();
      if (faces != null) {
        for (Rectangle f : faces) {
          f.x      = (int)(f.x      / DETECT_SCALE);
          f.y      = (int)(f.y      / DETECT_SCALE);
          f.width  = (int)(f.width  / DETECT_SCALE);
          f.height = (int)(f.height / DETECT_SCALE);
        }
      }
    }
  }

  // ⑥ 人脸椭圆轮廓 + 粒子生成
  if (faces != null && faces.length > 0) {
    for (Rectangle face : faces) {
      float cx = (width - face.x - face.width) + face.width / 2.0;
      float cy = face.y + face.height / 2.0;
      float rx = face.width  / 2.0;
      float ry = face.height / 2.0;

      noFill();
      strokeWeight(1.5);
      stroke(120, 80, 90, FACE_ALPHA);
      ellipse(cx, cy, rx * 2, ry * 2);

      for (int i = 0; i < PARTICLES_PER_FRAME; i++) {
        float angle = random(TWO_PI);
        float px = cx + rx * cos(angle);
        float py = cy + ry * sin(angle);
        particles.add(new Particle(px, py, angle));
      }
    }
  }

  // ⑦ 粒子更新 + 绘制
  updateAndDrawParticles();

  // ⑧ HUD（FIX #3: 用 pushStyle/popStyle 隔离 RGB 模式，不污染全局）
  drawHUD();

  // ⑨ 推进动画变量（放慢漂移，视觉更流畅）
  bgHue1 = (bgHue1 + 0.05) % 360;
  bgHue2 = (bgHue2 + 0.05) % 360;
  noiseT += 0.0022;
}

//...New...//
// FIX content: 步长与高度统一为 2px，消除条纹重叠抖动
// 纯实色渐变背景（alpha=100，稳定不闪）
void drawGradientBackground() {
  noStroke();
  for (int y = 0; y < height; y += 2) {
    float t   = (float)y / height;
    float hue = lerp(bgHue1, bgHue2, t) % 360;
    float sat = lerp(58, 78, t);
    float bri = lerp(88, 68, t);
    fill(hue, sat, bri);          // 完全不透明，作为稳定底层
    rect(0, y, width, 2);         // FIX #2: 高度改为 2，与步长一致
  }
}

// Perlin 流动线条
// FIX content: 删除冗余的 colorMode 调用
void drawFlowingLines() {
  noFill();
  strokeWeight(0.75);
  for (int i = 0; i < 60; i++) {
    float seed    = i * 137.508;
    float lineHue = (bgHue1 + i * 5.6) % 360;
    stroke(lineHue, 78, 95, 16);
    beginShape();
    for (int j = 0; j <= 20; j++) {
      float nx = noise(seed * 0.008 + j * 0.11, noiseT)        * width;
      float ny = noise(seed * 0.008 + j * 0.11 + 87.3, noiseT) * height;
      curveVertex(nx, ny);
    }
    endShape();
  }
}

// 绘制预生成树枝 twigs
// FIX #3: 删除冗余的 colorMode 调用
void drawBranches() {
  noFill();
  for (float[] b : branchList) {
    float depth = b[4];
    float alpha = map(depth, 1, 5, 16, 38);
    float sw    = map(depth, 1, 5, 0.4, 2.2);
    float hue   = map(depth, 1, 5, 115, 82);
    stroke(hue, 52, 42, alpha);
    strokeWeight(sw);
    line(b[0], b[1], b[2], b[3]);
  }
}

// 粒子更新 + Iterator 删除（O(1)）
void updateAndDrawParticles() {
  java.util.Iterator<Particle> it = particles.iterator();
  while (it.hasNext()) {
    Particle p = it.next();
    p.update();
    p.display();
    if (p.isDead()) it.remove();
  }
  while (particles.size() > MAX_PARTICLES)
    particles.removeFirst();
}

// HUD 
// FIX content: pushStyle/popStyle 隔离 RGB 模式，draw() 结束后 HSB 自动恢复
void drawHUD() {
  pushStyle();
  colorMode(RGB, 255);
  fill(200);
  noStroke();
  textSize(13);
  textAlign(LEFT, TOP);
  int faceCount = (faces != null) ? faces.length : 0;
  text("FPS: "  + nf(frameRate, 0, 1), 10, 10);
  text("Face: " + faceCount,           10, 28);
  text("Particle: " + particles.size(),    10, 46);
  popStyle();
}

//...New...//
//  装饰类（FIX #3: 所有类中删除冗余的 colorMode 调用）
// 
// 蘑菇 Mushroon stuff ( Fungus ) 
// [B] 检测到人脸时绕人脸椭圆轨道运动，否则保持原来的自由漂移
class Mushroom {
  float x, y, sz, phase, hue;
  // [B] 轨道参数
  float orbitAngle;   // 当前轨道角度
  float orbitRadius;  // 轨道半径
  float orbitSpeed;   // 每帧角速度

  Mushroom(float x, float y, float sz) {
    this.x = x; this.y = y; this.sz = sz;
    phase       = random(TWO_PI);
    hue         = random(265, 330);
    orbitAngle  = random(TWO_PI);          // 每个蘑菇从不同角度出发
    orbitRadius = random(130, 210);        // 轨道半径略大于脸部
    orbitSpeed  = random(0.008, 0.018);   // 公转速度
  }

  void update() {
    if (faceCenter != null) {
      // [B] 绕人脸中心做椭圆轨道（竖向略扁）
      orbitAngle += orbitSpeed;
      x = faceCenter.x + cos(orbitAngle) * orbitRadius;
      y = faceCenter.y + sin(orbitAngle) * orbitRadius * 0.55;
    } else {
      // 原版自由漂移
      x += sin(frameCount * 0.012 + phase) * 0.18;
    }
  }

  void display() {
    float bob = sin(frameCount * 0.022 + phase) * 2.8;
    float fy  = y + bob;
    noStroke();

    fill(hue, 48, 100, 16);
    ellipse(x, fy + sz * 0.08, sz * 1.65, sz * 0.78);

    fill(hue, 78, 80, 62);
    arc(x, fy, sz, sz * 0.72, PI, TWO_PI);

    fill(hue - 20, 40, 100, 42);
    arc(x, fy, sz * 0.85, sz * 0.55, PI + 0.3, TWO_PI - 0.3);

    fill(0, 0, 100, 52);
    ellipse(x - sz * 0.19, fy - sz * 0.22, sz * 0.14, sz * 0.14);
    ellipse(x + sz * 0.13, fy - sz * 0.16, sz * 0.10, sz * 0.10);
    ellipse(x + sz * 0.02, fy - sz * 0.30, sz * 0.08, sz * 0.08);

    fill(hue - 25, 22, 92, 52);
    rect(x - sz * 0.09, fy, sz * 0.18, sz * 0.40, 2);

    fill(hue, 55, 100, 14);
    ellipse(x, fy + sz * 0.45, sz * 0.90, sz * 0.24);
  }
}

// 水晶（图3 风格，底部发光） 
// 水晶固定在底部，不参与轨道运动
class Crystal {
  float x, y, h, hue, phase, lean;

  Crystal(float x, float y) {
    this.x = x; this.y = y;
    h     = random(26, 66);
    hue   = random(178, 252);
    phase = random(TWO_PI);
    lean  = random(-0.18, 0.18);
  }

  void display() {
    float glow = (sin(frameCount * 0.032 + phase) + 1) * 0.5;
    float tx   = x + lean * h;
    noStroke();

    fill(hue, 52, 100, 10 + glow * 14);
    ellipse(x + lean * h * 0.5, y - h * 0.48, h * 0.95, h * 1.35);

    fill(hue, 82, 85, 52 + glow * 18);
    triangle(tx, y - h, x - h * 0.20, y, x + h * 0.20, y);

    fill(hue - 18, 35, 100, 68);
    triangle(tx, y - h, tx - h * 0.04, y - h * 0.26, tx + h * 0.12, y - h * 0.48);

    fill(hue + 38, 18, 100, 28 + glow * 44);
    ellipse(tx - h * 0.03, y - h * 0.50, h * 0.11, h * 0.38);

    fill(hue, 60, 100, 12 + glow * 10);
    ellipse(x, y, h * 0.60, h * 0.14);
  }
}

// 浮动光球 Lighting ball 
// 检测到人脸时绕人脸做圆形轨道，否则保持原来向上漂浮
class FloatOrb {
  float x, y, vx, vy, sz, hue, phase;
  // [B] 轨道参数
  float orbitAngle;
  float orbitRadius;
  float orbitSpeed;

  FloatOrb(float x, float y) {
    this.x = x; this.y = y;
    vx    = random(-0.22, 0.22);
    vy    = random(-0.42, -0.06);
    sz    = random(4, 19);
    hue   = random(148, 322);
    phase = random(TWO_PI);
    orbitAngle  = random(TWO_PI);         //
    orbitRadius = random(90, 260);        // 范围更广，形成多层次效果
    orbitSpeed  = random(-0.025, 0.025);  // 正负方向随机，有顺逆时针
    if (abs(orbitSpeed) < 0.008)
      orbitSpeed = (orbitSpeed >= 0 ? 0.010 : -0.010);
  }

  void update() {
    if (faceCenter != null) {
      // [B] 绕人脸中心做圆形轨道
      orbitAngle += orbitSpeed;
      x = faceCenter.x + cos(orbitAngle) * orbitRadius;
      y = faceCenter.y + sin(orbitAngle) * orbitRadius;
    } else {
      // 原版向上漂浮
      x += vx + sin(frameCount * 0.017 + phase) * 0.55;
      y += vy;
      if (y < -sz * 2)   { y = height + sz; x = random(width); }
      if (x < -sz)         x = width  + sz;
      if (x > width + sz)  x = -sz;
    }
  }

  void display() {
    float pulse = (sin(frameCount * 0.058 + phase) + 1) * 0.5;
    noStroke();
    fill(hue, 42, 100, 10 + pulse * 9);
    ellipse(x, y, sz * 2.9, sz * 2.9);
    fill(hue, 62, 100, 42 + pulse * 22);
    ellipse(x, y, sz, sz);
    fill(hue + 22, 18, 100, 72);
    ellipse(x, y, sz * 0.36, sz * 0.36);
  }
}

// 星光（四射星） 
// [B] 检测到人脸时绕人脸做轨道，否则保持原来的随机闪烁
class Sparkle {
  float x, y, sz, hue, phase;
  // [B] 轨道参数
  float orbitAngle;
  float orbitRadius;
  float orbitSpeed;

  Sparkle(float x, float y) {
    this.x = x; this.y = y;
    sz    = random(3, 10);
    hue   = random(35, 75);
    phase = random(TWO_PI);
    orbitAngle  = random(TWO_PI);          // [B]
    orbitRadius = random(70, 230);         // [B] 多层轨道半径
    orbitSpeed  = random(0.010, 0.030);    // [B] 星光速度稍快，更活泼
  }

  void update() {
    if (faceCenter != null) {
      // [B] 绕人脸中心做圆形轨道
      orbitAngle += orbitSpeed;
      x = faceCenter.x + cos(orbitAngle) * orbitRadius;
      y = faceCenter.y + sin(orbitAngle) * orbitRadius * 0.7; // 轻微椭圆
    } else {
      // 原版随机闪现
      if (random(1) < 0.003) { x = random(width); y = random(height); }
    }
  }

  void display() {
    float t   = (sin(frameCount * 0.075 + phase) + 1) * 0.5;
    float alp = t * 68;
    float s   = sz * (0.45 + t * 0.55);
    noStroke();

    fill(hue, 55, 100, alp);
    ellipse(x, y, s * 0.28, s * 2.1);
    ellipse(x, y, s * 2.1,  s * 0.28);

    pushMatrix();
    translate(x, y);
    rotate(QUARTER_PI);
    fill(hue, 40, 100, alp * 0.55);
    ellipse(0, 0, s * 0.18, s * 1.4);
    ellipse(0, 0, s * 1.4,  s * 0.18);
    popMatrix();

    fill(hue - 5, 18, 100, alp * 1.25);
    ellipse(x, y, s * 0.48, s * 0.48);
  }
}

//...New...//
//  粒子（原版不变）
// 
class Particle {
  float x, y, vx, vy, life, maxLife, hue, sz;

  Particle(float x, float y, float angle) {
    this.x = x; this.y = y;
    float speed   = random(0.4, 2.5);
    float scatter = random(-0.4, 0.4);
    vx      = cos(angle + scatter) * speed;
    vy      = sin(angle + scatter) * speed;
    maxLife = random(40, 90);
    life    = maxLife;
    hue     = random(160, 300);
    sz      = random(2, 6);
  }

  void update() {
    x += vx; y += vy;
    vy += 0.04; vx *= 0.98; vy *= 0.98;
    life--;
  }

  void display() {
    float progress = life / maxLife;
    float alpha    = progress * 90;
    float sat      = map(progress, 0, 1, 20, 90);
    float bright   = map(progress, 0, 1, 60, 100);
    float drawSz   = sz * progress;
    noStroke();
    fill(hue, sat, bright, alpha);
    ellipse(x, y, drawSz, drawSz);
    fill(hue, 20, 100, alpha * 0.6);
    ellipse(x, y, drawSz * 0.4, drawSz * 0.4);
  }

  boolean isDead() { return life <= 0; }
}
