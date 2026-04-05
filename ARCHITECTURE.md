# Magic Hands - Architecture, Build Plan & Progress Tracker

> **Last updated**: 2026-04-04
> **Status**: BUILD COMPLETE — All code written, compiled, ready for testing
> **Project file location**: Also saved at `ARCHITECTURE.md` in project root

---

## Context

Building an interactive web app that uses a webcam to track hand gestures and manipulate 3D holographic objects overlaid on the real camera feed — like Tony Stark's JARVIS interface. The app is purely gesture-driven (no voice), supports save/load, and renders objects with Iron Man-style holographic blue glow.

---

## Progress Tracker

### Batch 1: Foundation (4 parallel agents — no dependencies)

#### Agent A — Foundation + Camera + Tracking ✅ COMPLETE
- [x] `package.json`
- [x] `vite.config.js`
- [x] `index.html`
- [x] `src/main.js`
- [x] `src/core/EventBus.js`
- [x] `src/core/CoordinateMapper.js`
- [x] `src/camera/CameraManager.js`
- [x] `src/tracking/HandTracker.js`
- [x] `src/tracking/SmoothingFilter.js`
- [x] `src/tracking/HandVisualizer.js`
- [x] `styles/main.css`
- [x] `src/utils/Constants.js`

#### Agent B — Gesture Recognition System ✅ COMPLETE
- [x] `src/gestures/GestureEngine.js`
- [x] `src/gestures/GestureConfig.js`
- [x] `src/gestures/detectors/PinchDetector.js`
- [x] `src/gestures/detectors/RotateDetector.js`
- [x] `src/gestures/detectors/ScaleDetector.js`
- [x] `src/gestures/detectors/SwipeDetector.js`
- [x] `src/gestures/detectors/CircleDetector.js`
- [x] `src/gestures/detectors/PointDetector.js`
- [x] `src/utils/MathUtils.js`

#### Agent C — Three.js Scene + Holographic Objects ✅ COMPLETE
- [x] `src/scene/SceneManager.js`
- [x] `src/scene/ObjectManager.js`
- [x] `src/scene/ObjectFactory.js`
- [x] `src/scene/Raycaster.js`
- [x] `shaders/hologram.vert`
- [x] `shaders/hologram.frag`
- [x] `src/objects/HologramMaterial.js`
- [x] `src/objects/HologramOutline.js`
- [x] `src/objects/HologramParticles.js`
- [x] `src/objects/primitives/HoloCube.js`
- [x] `src/objects/primitives/HoloSphere.js`
- [x] `src/objects/primitives/HoloCylinder.js`
- [x] `src/objects/primitives/HoloTorus.js`
- [x] `src/objects/primitives/HoloCone.js`
- [x] `src/objects/primitives/HoloPlane.js`

#### Agent D — UI + Persistence ✅ COMPLETE
- [x] `src/ui/SideMenu.js`
- [x] `src/ui/MenuPointer.js`
- [x] `src/ui/HUD.js`
- [x] `styles/menu.css`
- [x] `styles/hud.css`
- [x] `src/persistence/SceneSerializer.js`
- [x] `src/persistence/StorageManager.js`
- [x] `src/persistence/ProjectManager.js`

### Batch 2: Integration (depends on Batch 1)

#### Agent E — Interaction + Final Wiring ✅ COMPLETE
- [x] `src/interaction/InteractionManager.js`
- [x] `src/interaction/GrabController.js`
- [x] `src/interaction/RotateController.js`
- [x] `src/interaction/ScaleController.js`
- [x] `src/interaction/DeleteController.js`
- [x] `src/core/App.js`
- [x] Update `src/main.js` with final wiring

### Batch 3: Verification & Testing
- [x] `npm install` succeeds (16 packages, 0 vulnerabilities)
- [x] `npm run dev` starts without errors (Vite v6.4.1, localhost:5173)
- [x] `vite build` compiles successfully (50 modules, 0 errors)
- [ ] All test cases pass (see Test Cases section below)
- [ ] Integration issues fixed

### Post-Build Polish
- [ ] Performance optimization (if needed)
- [ ] Mobile responsiveness testing
- [ ] Edge case handling

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Build tool | Vite | Fast HMR, ESM-native, zero config |
| Hand tracking | MediaPipe Hands (`@mediapipe/tasks-vision`) | Browser-native, 21 landmarks/hand, works on webcam + phone |
| 3D rendering | Three.js | Mature WebGL, custom shaders, model loading |
| Styling | Vanilla CSS | No framework needed for overlay UI |
| Persistence | localStorage | No backend required |

---

## Architecture Overview

```
Camera Feed (HTML video) ──background layer──┐
                                              ├── Layered in DOM (CSS z-index)
Three.js Canvas (transparent bg) ──mid layer──┤
                                              │
HTML UI Overlay (menus/HUD) ──top layer───────┘

Data Flow Pipeline:
Camera Frame
  → MediaPipe HandLandmarker
    → 21 raw landmarks per hand (x, y, z normalized)
      → One Euro Smoothing Filter (reduce jitter)
        → EventBus "hand:update"
          → GestureEngine (runs all 6 detectors)
            → EventBus "gesture:*" events
              → InteractionManager
                → GrabController / RotateController / ScaleController / DeleteController
                  → Three.js Object Transforms (position, rotation, scale)
                    → Renderer draws frame
```

**Key architectural pattern: Event Bus** — All modules communicate via a central pub/sub EventBus. This fully decouples modules, enabling:
1. Parallel development (modules only depend on event contracts, not each other)
2. Easy testing (mock events in, assert events out)
3. Clean separation of concerns

---

## Event Contracts

These are the **exact** event names and payload shapes every module must use. This is the contract that enables parallel development.

```javascript
// ═══════════════════════════════════════════════════
// CAMERA EVENTS
// ═══════════════════════════════════════════════════
"camera:ready"   → { video: HTMLVideoElement }
// Emitted by: CameraManager
// Consumed by: HandTracker, HandVisualizer

// ═══════════════════════════════════════════════════
// HAND TRACKING EVENTS
// ═══════════════════════════════════════════════════
"hand:update"    → { 
  hands: [{ 
    landmarks: [{x, y, z}, ...21 items],  // smoothed, normalized 0-1
    handedness: "Left" | "Right" 
  }] 
}
// Emitted by: HandTracker (every frame hands are detected)
// Consumed by: GestureEngine, HandVisualizer

"hand:lost"      → { handedness: "Left" | "Right" }
// Emitted by: HandTracker (when a previously tracked hand disappears)
// Consumed by: GestureEngine, InteractionManager

// ═══════════════════════════════════════════════════
// GESTURE EVENTS
// ═══════════════════════════════════════════════════
"gesture:pinch"  → { 
  hand: "left" | "right", 
  position: {x, y, z},     // normalized MediaPipe coords of pinch midpoint
  state: "start" | "hold" | "end" 
}
// Emitted by: GestureEngine (PinchDetector)
// Consumed by: InteractionManager, MenuPointer

"gesture:rotate" → { 
  hand: "left" | "right", 
  angle: number,   // absolute angle in radians
  delta: number    // change since last frame in radians
}
// Emitted by: GestureEngine (RotateDetector) — only while pinch is active
// Consumed by: InteractionManager (RotateController)

"gesture:scale"  → { 
  hands: "both", 
  factor: number,  // ratio relative to initial distance (1.0 = no change)
  delta: number    // change since last frame
}
// Emitted by: GestureEngine (ScaleDetector) — requires both hands pinching
// Consumed by: InteractionManager (ScaleController)

"gesture:swipe"  → { 
  hand: "left" | "right", 
  direction: {x, y},   // normalized direction vector
  velocity: number      // speed of swipe (pixels/frame normalized)
}
// Emitted by: GestureEngine (SwipeDetector)
// Consumed by: InteractionManager (DeleteController)

"gesture:circle" → { 
  hand: "left" | "right", 
  state: "detected"   // fires once per completed circle
}
// Emitted by: GestureEngine (CircleDetector)
// Consumed by: SideMenu (toggles open/close)

"gesture:point"  → { 
  hand: "left" | "right", 
  screenPosition: {x, y},       // pixel coords on screen
  worldPosition: {x, y, z}      // Three.js world coords
}
// Emitted by: GestureEngine (PointDetector) — every frame while pointing
// Consumed by: InteractionManager, MenuPointer

// ═══════════════════════════════════════════════════
// OBJECT EVENTS
// ═══════════════════════════════════════════════════
"object:create"  → { type: string, position: {x, y, z} }
// Emitted by: SideMenu (when user selects a primitive)
// Consumed by: ObjectManager

"object:grab"    → { objectId: string, hand: "left" | "right" }
// Emitted by: InteractionManager (GrabController)
// Consumed by: ObjectManager (updates object state)

"object:release" → { objectId: string }
// Emitted by: InteractionManager (GrabController)
// Consumed by: ObjectManager

"object:delete"  → { objectId: string }
// Emitted by: InteractionManager (DeleteController)
// Consumed by: ObjectManager (removes from scene)

// ═══════════════════════════════════════════════════
// MENU EVENTS
// ═══════════════════════════════════════════════════
"menu:toggle"    → {}
// Emitted by: GestureEngine (on circle gesture)
// Consumed by: SideMenu

"menu:hover"     → { item: string | null }
// Emitted by: MenuPointer
// Consumed by: SideMenu (highlights item)

"menu:select"    → { item: string }
// Emitted by: MenuPointer (pinch on hovered item)
// Consumed by: SideMenu (dispatches action — spawn object, save, load, etc.)

// ═══════════════════════════════════════════════════
// SCENE / PERSISTENCE EVENTS
// ═══════════════════════════════════════════════════
"scene:save"     → { name: string }
// Emitted by: SideMenu
// Consumed by: ProjectManager

"scene:load"     → { name: string }
// Emitted by: SideMenu
// Consumed by: ProjectManager → SceneSerializer → ObjectManager

"scene:new"      → {}
// Emitted by: SideMenu
// Consumed by: ProjectManager → ObjectManager (clears all objects)

"scene:loaded"   → { objects: [{ type, position, rotation, scale }] }
// Emitted by: ProjectManager (after deserializing)
// Consumed by: ObjectManager (recreates objects)
```

---

## File Structure

```
magic-hands/
├── index.html                               # Entry point — layered DOM
├── package.json                             # Dependencies & scripts
├── vite.config.js                           # Dev server config
├── ARCHITECTURE.md                          # This file
├── src/
│   ├── main.js                              # Bootstrap — imports App, calls init()
│   ├── core/
│   │   ├── EventBus.js                      # Pub/sub singleton
│   │   ├── App.js                           # Main orchestrator — inits all modules
│   │   └── CoordinateMapper.js              # MediaPipe normalized → Three.js world
│   ├── camera/
│   │   └── CameraManager.js                 # getUserMedia, video element, mirror
│   ├── tracking/
│   │   ├── HandTracker.js                   # MediaPipe HandLandmarker wrapper
│   │   ├── HandVisualizer.js                # Debug: draw hand skeleton on canvas
│   │   └── SmoothingFilter.js               # One Euro Filter implementation
│   ├── gestures/
│   │   ├── GestureEngine.js                 # Runs all detectors, manages priority
│   │   ├── GestureConfig.js                 # Thresholds & tuning constants
│   │   └── detectors/
│   │       ├── PinchDetector.js             # Thumb tip ↔ index tip distance
│   │       ├── RotateDetector.js            # Wrist-to-MCP angle delta
│   │       ├── ScaleDetector.js             # Two-hand pinch distance ratio
│   │       ├── SwipeDetector.js             # Palm velocity vector
│   │       ├── CircleDetector.js            # Finger tip angular accumulation
│   │       └── PointDetector.js             # Index extended, others curled
│   ├── scene/
│   │   ├── SceneManager.js                  # Three.js scene/camera/renderer/lights
│   │   ├── ObjectManager.js                 # Object CRUD, selection state
│   │   ├── ObjectFactory.js                 # String type → holographic mesh
│   │   └── Raycaster.js                     # Screen coords → 3D object picking
│   ├── objects/
│   │   ├── HologramMaterial.js              # Custom ShaderMaterial
│   │   ├── HologramOutline.js               # Wireframe edge glow
│   │   ├── HologramParticles.js             # Floating particle dust
│   │   └── primitives/
│   │       ├── HoloCube.js                  # BoxGeometry + hologram
│   │       ├── HoloSphere.js                # SphereGeometry + hologram
│   │       ├── HoloCylinder.js              # CylinderGeometry + hologram
│   │       ├── HoloTorus.js                 # TorusGeometry + hologram
│   │       ├── HoloCone.js                  # ConeGeometry + hologram
│   │       └── HoloPlane.js                 # PlaneGeometry + hologram
│   ├── interaction/
│   │   ├── InteractionManager.js            # Gesture events → object transforms
│   │   ├── GrabController.js                # Pinch → grab + move
│   │   ├── RotateController.js              # Wrist twist → rotate
│   │   ├── ScaleController.js               # Two-hand spread → scale
│   │   └── DeleteController.js              # Swipe off-screen → remove
│   ├── ui/
│   │   ├── SideMenu.js                      # Slide-in panel, object grid, scene controls
│   │   ├── MenuPointer.js                   # Finger cursor for menu navigation
│   │   └── HUD.js                           # Status text, gesture hints
│   ├── persistence/
│   │   ├── SceneSerializer.js               # Scene objects ↔ JSON
│   │   ├── StorageManager.js                # localStorage wrapper
│   │   └── ProjectManager.js                # New / Save / Load / Delete
│   └── utils/
│       ├── MathUtils.js                     # Vector math, angle helpers
│       └── Constants.js                     # App-wide config values
├── shaders/
│   ├── hologram.vert                        # Vertex shader
│   └── hologram.frag                        # Fragment shader
└── styles/
    ├── main.css                             # Layout, z-index layering, reset
    ├── menu.css                             # Iron Man styled side panel
    └── hud.css                              # HUD overlay
```

---

## Detailed Module Specifications

### 1. Core: EventBus (`src/core/EventBus.js`)

Simple pub/sub singleton. All inter-module communication goes through this.

```javascript
class EventBus {
  constructor() { this.listeners = new Map(); }
  
  on(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback); // return unsubscribe function
  }
  
  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
  }
  
  emit(event, data) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }
}

export default new EventBus(); // singleton
```

### 2. Core: CoordinateMapper (`src/core/CoordinateMapper.js`)

Transforms MediaPipe normalized coordinates to Three.js world space.

**MediaPipe coordinate system:**
- x: 0 (left edge) → 1 (right edge)
- y: 0 (top edge) → 1 (bottom edge)
- z: negative values = closer to camera

**Three.js coordinate system:**
- x: negative (left) → positive (right)
- y: negative (down) → positive (up)
- z: positive (toward camera)

**Mapping formulas:**
```javascript
// Configuration
const VIEW_WIDTH = 8;    // Three.js units spanning the camera view width
const VIEW_HEIGHT = 6;   // Derived from aspect ratio
const DEPTH_SCALE = 5;   // How much to amplify depth

toThreeJS(mpLandmark) {
  return {
    x: (mpLandmark.x - 0.5) * VIEW_WIDTH,
    y: -(mpLandmark.y - 0.5) * VIEW_HEIGHT,
    z: -mpLandmark.z * DEPTH_SCALE
  };
}

toScreen(mpLandmark, canvasWidth, canvasHeight) {
  return {
    x: mpLandmark.x * canvasWidth,
    y: mpLandmark.y * canvasHeight
  };
}
```

### 3. Camera: CameraManager (`src/camera/CameraManager.js`)

**Responsibilities:**
- Request webcam access via `navigator.mediaDevices.getUserMedia`
- Constraints: `{ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } }`
- Create `<video>` element, set `autoplay`, `playsinline`, `muted`
- Apply CSS `transform: scaleX(-1)` to mirror (selfie mode)
- Insert video element into `#camera-container` div
- Emit `"camera:ready"` with the video element
- Handle errors: permission denied, no camera found → show message in HUD

### 4. Tracking: HandTracker (`src/tracking/HandTracker.js`)

**Responsibilities:**
- Import `HandLandmarker`, `FilesetResolver` from `@mediapipe/tasks-vision`
- Initialize with WASM + model from CDN:
  ```javascript
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );
  const handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task" },
    runningMode: "VIDEO",
    numHands: 2,
    minHandDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });
  ```
- On each animation frame: call `handLandmarker.detectForVideo(video, timestamp)`
- Apply `SmoothingFilter` to each landmark
- Emit `"hand:update"` with smoothed landmarks
- Track previously seen hands — emit `"hand:lost"` when one disappears

### 5. Tracking: SmoothingFilter (`src/tracking/SmoothingFilter.js`)

**One Euro Filter** — the gold standard for noisy real-time signal smoothing.

**Key properties:**
- Smooth when the hand is still (low cutoff → heavy smoothing)
- Responsive when the hand moves fast (high cutoff → light smoothing)
- Three parameters: `minCutoff` (default 1.0), `beta` (default 0.0), `dCutoff` (default 1.0)

**Algorithm:**
```javascript
class OneEuroFilter {
  constructor(minCutoff = 1.0, beta = 0.007, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.xPrev = null;
    this.dxPrev = 0;
    this.tPrev = null;
  }
  
  filter(x, timestamp) {
    if (this.tPrev === null) {
      this.xPrev = x;
      this.tPrev = timestamp;
      return x;
    }
    
    const dt = (timestamp - this.tPrev) / 1000 || 1/60;
    this.tPrev = timestamp;
    
    // Derivative
    const dx = (x - this.xPrev) / dt;
    const alphaDx = this._alpha(this.dCutoff, dt);
    const dxSmoothed = alphaDx * dx + (1 - alphaDx) * this.dxPrev;
    this.dxPrev = dxSmoothed;
    
    // Adaptive cutoff
    const cutoff = this.minCutoff + this.beta * Math.abs(dxSmoothed);
    const alpha = this._alpha(cutoff, dt);
    
    // Smoothed value
    const xSmoothed = alpha * x + (1 - alpha) * this.xPrev;
    this.xPrev = xSmoothed;
    
    return xSmoothed;
  }
  
  _alpha(cutoff, dt) {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }
}
```

**Usage:** Create one filter instance per axis per landmark per hand:
```javascript
// handFilters[handIndex][landmarkIndex][axis] = OneEuroFilter instance
// Total: 2 hands × 21 landmarks × 3 axes = 126 filters
```

### 6. Tracking: HandVisualizer (`src/tracking/HandVisualizer.js`)

**Debug overlay** — draws hand skeleton on a 2D canvas overlaid on the video.

- Creates a `<canvas>` element sized to match the video
- Subscribes to `"hand:update"`
- Draws:
  - Circles at each of the 21 landmarks
  - Lines connecting landmarks per MediaPipe hand topology
  - Color-coded: thumb=red, index=green, middle=blue, ring=yellow, pinky=purple
- Toggle on/off via keyboard shortcut (e.g., `D` key) or HUD button
- Uses `transform: scaleX(-1)` to match mirrored video

### 7. Gestures: GestureEngine (`src/gestures/GestureEngine.js`)

**Central state machine** that orchestrates all gesture detectors.

**Responsibilities:**
- Subscribe to `"hand:update"`
- Each frame: run all detectors in priority order
- Manage conflicts: if pinch is active, swipe detection uses different logic (swipe-while-grabbing = delete)
- Track per-hand state: `{ left: { pinching, pointing, ... }, right: { ... } }`
- Emit gesture events via EventBus

**Priority order:**
1. PinchDetector (highest — gates rotate/scale/delete)
2. RotateDetector (only during pinch-hold)
3. ScaleDetector (only when both hands pinching)
4. SwipeDetector (only during pinch-hold for delete, or open hand for dismiss)
5. CircleDetector (only when not pinching)
6. PointDetector (lowest — always-on when index is extended)

### 8. Gesture Detectors (individual files)

#### PinchDetector (`src/gestures/detectors/PinchDetector.js`)
```
Landmarks used: 4 (thumb tip), 8 (index tip)
Algorithm: distance = sqrt((l4.x - l8.x)² + (l4.y - l8.y)² + (l4.z - l8.z)²)
States: idle → start (distance < threshold for holdFrames frames) → hold → end (distance > threshold)
Emits: "gesture:pinch" with { hand, position: midpoint of thumb+index, state }
Config: threshold = 0.05, holdFrames = 3
```

#### RotateDetector (`src/gestures/detectors/RotateDetector.js`)
```
Landmarks used: 0 (wrist), 9 (middle finger MCP)
Algorithm: angle = atan2(l9.y - l0.y, l9.x - l0.x)
           delta = currentAngle - previousAngle (per frame)
Prerequisite: pinch must be in "hold" state
Emits: "gesture:rotate" with { hand, angle, delta }
Config: minDelta = 0.02 (ignore tiny movements)
```

#### ScaleDetector (`src/gestures/detectors/ScaleDetector.js`)
```
Landmarks used: pinch midpoints from both hands
Algorithm: currentDist = distance between left and right pinch midpoints
           factor = currentDist / initialDist (captured when both hands start pinching)
Prerequisite: both hands must be in pinch "hold" state
Emits: "gesture:scale" with { hands: "both", factor, delta }
Config: minFactor = 0.1, maxFactor = 5.0 (clamp range)
```

#### SwipeDetector (`src/gestures/detectors/SwipeDetector.js`)
```
Landmarks used: 0, 5, 9, 13, 17 (wrist + finger MCPs = palm center)
Algorithm: palmCenter = average of above landmarks
           velocity = (currentPalmCenter - previousPalmCenter) / dt
           If |velocity| > threshold for minFrames → swipe detected
           direction = normalize(velocity vector)
Emits: "gesture:swipe" with { hand, direction, velocity }
Config: velocityThreshold = 0.15, minFrames = 3
```

#### CircleDetector (`src/gestures/detectors/CircleDetector.js`)
```
Landmarks used: 8 (index finger tip)
Algorithm: Store last N positions of index tip in a ring buffer
           For each consecutive pair: compute angle delta (atan2)
           Accumulate total angle
           If accumulated angle > ~1.8π (nearly full circle) within maxFrames → detected
           Reset accumulator after detection
Prerequisite: not pinching
Emits: "gesture:circle" with { hand, state: "detected" }
Config: minAngle = Math.PI * 1.8, maxFrames = 60 (1 second at 60fps)
```

#### PointDetector (`src/gestures/detectors/PointDetector.js`)
```
Landmarks used: 0 (wrist), 5 (index MCP), 6 (index PIP), 8 (index tip)
                12 (middle tip), 16 (ring tip), 20 (pinky tip)
                10 (middle PIP), 14 (ring PIP), 18 (pinky PIP)
Algorithm: indexExtended = dist(8, 0) > dist(6, 0) * extensionRatio
           othersCurled = dist(12, 0) < dist(10, 0) 
                       && dist(16, 0) < dist(14, 0)
                       && dist(20, 0) < dist(18, 0)
           pointing = indexExtended && othersCurled
Emits: "gesture:point" with { hand, screenPosition, worldPosition }
Config: extensionRatio = 1.3
```

### 9. GestureConfig (`src/gestures/GestureConfig.js`)
```javascript
export default {
  pinch: { threshold: 0.05, holdFrames: 3 },
  rotate: { minDelta: 0.02 },
  scale: { minFactor: 0.1, maxFactor: 5.0 },
  swipe: { velocityThreshold: 0.15, minFrames: 3 },
  circle: { minAngle: Math.PI * 1.8, maxFrames: 60 },
  point: { extensionRatio: 1.3 }
};
```

### 10. Scene: SceneManager (`src/scene/SceneManager.js`)

**Three.js scene setup:**
```javascript
// Renderer — transparent so camera feed shows through
renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0); // fully transparent

// Camera — perspective, matching approximate webcam FOV
camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 100);
camera.position.set(0, 0, 5);

// Lighting — for holographic reflections
scene.add(new THREE.AmbientLight(0x404040, 0.5));
const pointLight = new THREE.PointLight(0x00d4ff, 1, 50);
pointLight.position.set(0, 2, 5);
scene.add(pointLight);

// Optional: EffectComposer with UnrealBloomPass for enhanced glow
// bloom = new UnrealBloomPass(resolution, strength=1.5, radius=0.4, threshold=0.1);
```

**Animation loop:**
```javascript
function animate() {
  requestAnimationFrame(animate);
  // Update all hologram uniforms (time)
  objectManager.update(clock.getElapsedTime());
  // Render
  renderer.render(scene, camera);
  // Or: composer.render() if using bloom
}
```

### 11. Scene: ObjectManager (`src/scene/ObjectManager.js`)

**Manages all objects in the scene:**
- `objects`: Map<string, { mesh, type, state }> — all active objects
- `selectedId`: string | null — currently highlighted object
- `grabbedObjects`: Map<string, handedness> — currently grabbed objects

**Methods:**
- `createObject(type, position)` → uses ObjectFactory, adds to scene, returns id
- `deleteObject(id)` → removes from scene, disposes geometry/material
- `getObjectAtPosition(worldPos)` → nearest object within grab radius
- `update(time)` → updates all hologram material uniforms (uTime)
- `getSerializableState()` → returns array of { type, position, rotation, scale }
- `loadState(objects)` → clears scene and recreates from array

**Events:**
- Listens: `"object:create"`, `"object:delete"`, `"scene:new"`, `"scene:loaded"`
- Emits: none directly (state changes are driven by InteractionManager)

### 12. Scene: ObjectFactory (`src/scene/ObjectFactory.js`)

```javascript
import HoloCube from '../objects/primitives/HoloCube.js';
import HoloSphere from '../objects/primitives/HoloSphere.js';
// ... etc

const PRIMITIVES = {
  cube: HoloCube,
  sphere: HoloSphere,
  cylinder: HoloCylinder,
  torus: HoloTorus,
  cone: HoloCone,
  plane: HoloPlane
};

export function createPrimitive(type, position = {x:0, y:0, z:0}) {
  const PrimitiveClass = PRIMITIVES[type];
  if (!PrimitiveClass) throw new Error(`Unknown primitive: ${type}`);
  return new PrimitiveClass(position);
}
```

### 13. Scene: Raycaster (`src/scene/Raycaster.js`)

**3D picking from screen/hand coordinates:**
```javascript
// From screen coordinates (for menu pointer)
pickFromScreen(screenX, screenY, camera, objects) {
  const ndc = new THREE.Vector2(
    (screenX / window.innerWidth) * 2 - 1,
    -(screenY / window.innerHeight) * 2 + 1
  );
  raycaster.setFromCamera(ndc, camera);
  return raycaster.intersectObjects(objects, true);
}

// From world position (for hand proximity)
pickFromWorldPosition(worldPos, objects, radius = 0.5) {
  // Find nearest object within radius
  let nearest = null, minDist = radius;
  for (const obj of objects) {
    const dist = obj.position.distanceTo(worldPos);
    if (dist < minDist) { nearest = obj; minDist = dist; }
  }
  return nearest;
}
```

### 14. Objects: Holographic Material System

#### HologramMaterial (`src/objects/HologramMaterial.js`)

Custom `THREE.ShaderMaterial`:
```javascript
new THREE.ShaderMaterial({
  vertexShader: hologramVert,   // loaded from shaders/
  fragmentShader: hologramFrag, // loaded from shaders/
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0x00d4ff) },
    uOpacity: { value: 0.3 },
    uSelected: { value: 0.0 }
  },
  transparent: true,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide,
  depthWrite: false
});
```

#### HologramOutline (`src/objects/HologramOutline.js`)

Wireframe edge glow:
```javascript
function createOutline(geometry) {
  const edges = new THREE.EdgesGeometry(geometry, 30); // 30° threshold
  const material = new THREE.LineBasicMaterial({
    color: 0x00d4ff,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending
  });
  const outline = new THREE.LineSegments(edges, material);
  outline.scale.multiplyScalar(1.01); // slightly larger to avoid z-fighting
  return outline;
}
```

#### HologramParticles (`src/objects/HologramParticles.js`)

Floating particle dust:
```javascript
function createParticles(boundingRadius, count = 30) {
  const positions = new Float32Array(count * 3);
  // Distribute particles in a sphere around the object
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const r = boundingRadius * (1.0 + Math.random() * 0.5);
    positions[i*3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i*3+2] = r * Math.cos(phi);
  }
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  
  const material = new THREE.PointsMaterial({
    color: 0x88ccff,
    size: 0.03,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  
  return new THREE.Points(geometry, material);
}

// In update(): slowly rotate particle system and oscillate individual positions
```

#### Primitive template (e.g., HoloCube):
```javascript
class HoloCube {
  constructor(position) {
    this.type = 'cube';
    this.id = crypto.randomUUID();
    this.group = new THREE.Group();
    
    // Main mesh
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    this.mesh = new THREE.Mesh(geometry, createHologramMaterial());
    this.group.add(this.mesh);
    
    // Wireframe outline
    this.outline = createOutline(geometry);
    this.group.add(this.outline);
    
    // Particles
    this.particles = createParticles(0.8);
    this.group.add(this.particles);
    
    // Position
    this.group.position.set(position.x, position.y, position.z);
  }
  
  update(time) {
    this.mesh.material.uniforms.uTime.value = time;
    this.particles.rotation.y = time * 0.2; // slow orbit
  }
  
  setSelected(selected) {
    this.mesh.material.uniforms.uSelected.value = selected ? 1.0 : 0.0;
  }
  
  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    // ... dispose outline, particles
  }
}
```

### 15. Holographic Shaders

**Vertex shader** (`shaders/hologram.vert`):
```glsl
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vPosition;
varying vec2 vUv;

void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-worldPos.xyz);
    vPosition = position;
    gl_Position = projectionMatrix * worldPos;
}
```

**Fragment shader** (`shaders/hologram.frag`):
```glsl
uniform float uTime;
uniform vec3 uColor;
uniform float uOpacity;
uniform float uSelected;

varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vPosition;
varying vec2 vUv;

void main() {
    // Fresnel rim glow — brighter at edges
    float fresnel = pow(1.0 - abs(dot(vNormal, vViewDir)), 3.0);
    
    // Animated scanlines
    float scanline = sin(vPosition.y * 50.0 + uTime * 2.0) * 0.5 + 0.5;
    scanline = smoothstep(0.3, 0.7, scanline) * 0.15;
    
    // Subtle flicker
    float flicker = sin(uTime * 8.0) * 0.03 + sin(uTime * 13.0) * 0.02 + 1.0;
    
    // Selection boost (brighter when grabbed/hovered)
    float selectionBoost = uSelected * 0.3;
    
    // Final composition
    float alpha = (fresnel * 0.7 + uOpacity + scanline + selectionBoost) * flicker;
    vec3 color = uColor * (fresnel * 1.5 + 0.6 + selectionBoost);
    
    gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
}
```

### 16. Interaction: InteractionManager (`src/interaction/InteractionManager.js`)

**Central coordinator** that maps gestures to object transforms.

**State tracking:**
```javascript
{
  hoveredObjectId: null,      // object finger is near
  grabbedObjects: new Map(),  // handedness → { objectId, offset }
  isMenuOpen: false           // suppress object interaction when menu is active
}
```

**Logic flow per frame:**
1. If menu is open → delegate to MenuPointer, skip object interaction
2. Process point gesture → raycast → update hoveredObjectId → set object selection glow
3. Process pinch start → if hoveredObject exists → grab it (GrabController)
4. Process pinch hold → update grabbed object position (GrabController)
5. Process rotate → apply to grabbed object (RotateController)
6. Process scale → apply to grabbed objects (ScaleController)
7. Process swipe during grab → check if off-screen → delete (DeleteController)
8. Process pinch end → release object (GrabController)

### 17. Interaction Controllers

#### GrabController (`src/interaction/GrabController.js`)
```
onPinchStart(hand, position):
  worldPos = CoordinateMapper.toThreeJS(position)
  object = ObjectManager.getObjectAtPosition(worldPos)
  if object:
    offset = object.position - worldPos  // maintain relative position
    grabbedObjects.set(hand, { objectId: object.id, offset })
    emit "object:grab"

onPinchHold(hand, position):
  if grabbedObjects.has(hand):
    worldPos = CoordinateMapper.toThreeJS(position)
    object.position = worldPos + offset

onPinchEnd(hand):
  if grabbedObjects.has(hand):
    emit "object:release"
    grabbedObjects.delete(hand)
```

#### RotateController (`src/interaction/RotateController.js`)
```
onRotate(hand, delta):
  if grabbedObjects.has(hand):
    object.rotation.z += delta  // apply wrist rotation to z-axis
    // Could also map to y-axis rotation for more intuitive feel
```

#### ScaleController (`src/interaction/ScaleController.js`)
```
onScale(factor, delta):
  // Find the object grabbed by either hand
  if grabbedObjects.size > 0:
    for each grabbed object:
      object.scale.multiplyScalar(1 + delta * 0.5)
      clamp(object.scale, MIN_SCALE, MAX_SCALE)
```

#### DeleteController (`src/interaction/DeleteController.js`)
```
onSwipe(hand, direction, velocity):
  if grabbedObjects.has(hand):
    // Check if swipe is fast enough and toward edge of screen
    if velocity > DELETE_VELOCITY_THRESHOLD:
      objectId = grabbedObjects.get(hand).objectId
      emit "object:delete" with { objectId }
      grabbedObjects.delete(hand)
```

### 18. UI: SideMenu (`src/ui/SideMenu.js`)

**HTML structure:**
```html
<div id="side-menu" class="side-menu hidden">
  <div class="menu-header">
    <span class="menu-title">MAGIC HANDS</span>
  </div>
  <div class="menu-section">
    <span class="section-title">OBJECTS</span>
    <div class="object-grid">
      <div class="menu-item" data-type="cube">▣ Cube</div>
      <div class="menu-item" data-type="sphere">● Sphere</div>
      <div class="menu-item" data-type="cylinder">⬡ Cylinder</div>
      <div class="menu-item" data-type="torus">◎ Torus</div>
      <div class="menu-item" data-type="cone">▲ Cone</div>
      <div class="menu-item" data-type="plane">▬ Plane</div>
    </div>
  </div>
  <div class="menu-section">
    <span class="section-title">SCENE</span>
    <div class="scene-controls">
      <div class="menu-item" data-action="new">New</div>
      <div class="menu-item" data-action="save">Save</div>
      <div class="menu-item" data-action="load">Load</div>
    </div>
  </div>
  <div class="project-list hidden">
    <!-- Dynamically populated -->
  </div>
</div>
```

**Behavior:**
- Subscribes to `"menu:toggle"` → slide in/out with CSS transition
- Subscribes to `"menu:hover"` → highlight item
- Subscribes to `"menu:select"` → dispatch action based on data-type or data-action
- When object selected → emit `"object:create"` with type and default position (center of screen)
- When "New" → emit `"scene:new"`
- When "Save" → prompt for name (or auto-name) → emit `"scene:save"`
- When "Load" → show project list → on select → emit `"scene:load"`

### 19. UI: MenuPointer (`src/ui/MenuPointer.js`)

**Finger-as-cursor when menu is open:**
- Subscribes to `"gesture:point"` — only active when menu is visible
- Maps finger `screenPosition` to menu DOM elements via `document.elementFromPoint()`
- If hovering a `.menu-item` → emit `"menu:hover"` with item identifier
- Subscribes to `"gesture:pinch"` — if a menu item is currently hovered → emit `"menu:select"`
- Renders a small cursor indicator at the finger position (CSS-positioned div)

### 20. UI: HUD (`src/ui/HUD.js`)

**Heads-up display:**
- Shows tracking status: "Hands detected: 0/1/2"
- Shows gesture hint: "Circle to open menu" (when no objects exist)
- Shows FPS counter (optional, toggled with 'F' key)
- Iron Man styled: top-right corner, blue text, monospace font
- Subscribes to `"hand:update"`, `"hand:lost"` for status

### 21. Persistence

#### SceneSerializer (`src/persistence/SceneSerializer.js`)
```javascript
serialize(objectManager) {
  return {
    version: 1,
    timestamp: Date.now(),
    objects: objectManager.getSerializableState()
    // Each: { type, position: {x,y,z}, rotation: {x,y,z}, scale: {x,y,z} }
  };
}

deserialize(json) {
  return json.objects; // Array of object descriptors
}
```

#### StorageManager (`src/persistence/StorageManager.js`)
```javascript
const PREFIX = 'magic-hands:';

save(key, data) { localStorage.setItem(PREFIX + key, JSON.stringify(data)); }
load(key) { return JSON.parse(localStorage.getItem(PREFIX + key)); }
delete(key) { localStorage.removeItem(PREFIX + key); }
list() { /* return all keys with PREFIX */ }
```

#### ProjectManager (`src/persistence/ProjectManager.js`)
- `newProject()` → emit `"scene:new"`
- `saveProject(name)` → serialize scene → store
- `loadProject(name)` → load from storage → deserialize → emit `"scene:loaded"`
- `listProjects()` → return saved project names
- `deleteProject(name)` → remove from storage

### 22. Utils

#### MathUtils (`src/utils/MathUtils.js`)
```javascript
distance(a, b)          // 3D distance between two {x,y,z} points
midpoint(a, b)          // midpoint between two {x,y,z} points
angle2D(a, b)           // atan2 angle between two 2D points
normalize2D(v)          // normalize a 2D vector
lerp(a, b, t)           // linear interpolation
clamp(v, min, max)      // clamp value to range
```

#### Constants (`src/utils/Constants.js`)
```javascript
export const HOLOGRAM_COLOR = 0x00d4ff;
export const HOLOGRAM_OPACITY = 0.3;
export const GRAB_RADIUS = 0.8;
export const DELETE_VELOCITY = 0.2;
export const MIN_SCALE = 0.1;
export const MAX_SCALE = 5.0;
export const VIEW_WIDTH = 8;
export const VIEW_HEIGHT = 6;
export const DEPTH_SCALE = 5;
```

---

## Parallel Build Strategy

### Batch 1: Four agents in parallel (no file overlap)

Each agent works in an isolated worktree. Files are merged after all complete.

**Agent A — "Foundation + Camera + Tracking"** (12 files)
Creates the project skeleton, camera integration, hand tracking pipeline, and smoothing.
Files: package.json, vite.config.js, index.html, src/main.js, src/core/EventBus.js, src/core/CoordinateMapper.js, src/camera/CameraManager.js, src/tracking/HandTracker.js, src/tracking/SmoothingFilter.js, src/tracking/HandVisualizer.js, styles/main.css, src/utils/Constants.js

**Agent B — "Gesture Recognition"** (9 files)
Creates the gesture engine and all 6 detectors.
Files: src/gestures/GestureEngine.js, src/gestures/GestureConfig.js, src/gestures/detectors/PinchDetector.js, src/gestures/detectors/RotateDetector.js, src/gestures/detectors/ScaleDetector.js, src/gestures/detectors/SwipeDetector.js, src/gestures/detectors/CircleDetector.js, src/gestures/detectors/PointDetector.js, src/utils/MathUtils.js

**Agent C — "Three.js + Holographic Objects"** (15 files)
Creates the 3D scene, holographic shader/materials, and all primitives.
Files: src/scene/SceneManager.js, src/scene/ObjectManager.js, src/scene/ObjectFactory.js, src/scene/Raycaster.js, shaders/hologram.vert, shaders/hologram.frag, src/objects/HologramMaterial.js, src/objects/HologramOutline.js, src/objects/HologramParticles.js, src/objects/primitives/HoloCube.js, HoloSphere.js, HoloCylinder.js, HoloTorus.js, HoloCone.js, HoloPlane.js

**Agent D — "UI + Persistence"** (8 files)
Creates the Iron Man-styled side menu, finger cursor, HUD, and save/load system.
Files: src/ui/SideMenu.js, src/ui/MenuPointer.js, src/ui/HUD.js, styles/menu.css, styles/hud.css, src/persistence/SceneSerializer.js, src/persistence/StorageManager.js, src/persistence/ProjectManager.js

### Batch 2: Integration (1 agent, after Batch 1 merges)

**Agent E — "Interaction + App Orchestrator"** (7 files)
Creates interaction controllers and the final App.js that wires everything together.
Files: src/interaction/InteractionManager.js, src/interaction/GrabController.js, src/interaction/RotateController.js, src/interaction/ScaleController.js, src/interaction/DeleteController.js, src/core/App.js, update src/main.js

### Batch 3: Verification & Fix

Run `npm install`, `npm run dev`, test all features, fix integration issues.

---

## Test Cases

### T1: Application Startup
```
TEST: App loads without errors
STEPS:
  1. Run `npm install`
  2. Run `npm run dev`
  3. Open browser to localhost URL
EXPECTED:
  - No console errors
  - Camera permission prompt appears
  - After granting permission, webcam feed visible as background
  - Three.js canvas is transparent overlay (no visible background)
  - HUD shows "Hands detected: 0"
```

### T2: Camera Feed
```
TEST: Camera feed displays correctly
STEPS:
  1. Grant camera permission
EXPECTED:
  - Video feed fills the viewport
  - Video is mirrored (selfie mode — raise right hand, it appears on right side of screen)
  - Feed is responsive to window resize
```

### T3: Hand Detection
```
TEST: Hands are detected and tracked
STEPS:
  1. Show one hand to camera
  2. Show two hands to camera
  3. Remove hands from view
EXPECTED:
  - HUD updates: "Hands detected: 1" then "2" then "0"
  - (With debug viz on) Hand skeleton drawn correctly over the hand
  - No significant lag (< 100ms perceived)
  - Landmarks track smoothly (no jitter when hand is still)
```

### T4: Menu Toggle (Circle Gesture)
```
TEST: Circular finger motion opens/closes side menu
STEPS:
  1. Make a circular motion with index finger
  2. Repeat to close
EXPECTED:
  - Side menu slides in from left after ~1 full circle
  - Menu shows object grid (Cube, Sphere, Cylinder, Torus, Cone, Plane)
  - Menu shows scene controls (New, Save, Load)
  - Second circle gesture closes menu
  - Iron Man aesthetic: dark translucent bg, blue borders, glow
```

### T5: Object Spawning via Menu
```
TEST: Select object from menu to spawn it
STEPS:
  1. Open menu (circle gesture)
  2. Point index finger at "Cube" menu item
  3. Pinch to select
EXPECTED:
  - Finger cursor visible on screen tracking finger position
  - "Cube" item highlights when finger hovers over it
  - On pinch: cube spawns at center of scene
  - Menu closes after spawning
  - Cube has holographic appearance: semi-transparent blue, edge glow, scanlines, particles
```

### T6: Holographic Visual Quality
```
TEST: Objects look like Iron Man holograms
STEPS:
  1. Spawn a cube
  2. Observe from different angles (move camera/head)
EXPECTED:
  - Semi-transparent blue (#00d4ff range)
  - Bright edges (Fresnel rim glow) — edges facing away from camera are brightest
  - Animated horizontal scanlines scrolling upward
  - Subtle brightness flicker
  - Wireframe outline visible on edges
  - Small blue particles floating around the object
  - Additive blending (glow-through effect, camera feed shows through)
```

### T7: Grab and Move
```
TEST: Pinch to grab an object and move it
STEPS:
  1. Spawn a cube
  2. Move hand near the cube
  3. Pinch (bring thumb and index finger together)
  4. Move hand while maintaining pinch
  5. Release pinch
EXPECTED:
  - Object highlights (brighter glow) when hand is near
  - On pinch: object attaches to hand position
  - Object follows hand movement smoothly
  - On release: object stays at the position where it was released
  - Object returns to normal glow after release
```

### T8: Rotate
```
TEST: Rotate grabbed object with wrist twist
STEPS:
  1. Grab an object (pinch)
  2. Twist wrist clockwise/counterclockwise while holding pinch
EXPECTED:
  - Object rotates in sync with wrist motion
  - Rotation is smooth and responsive
  - Rotation persists after release
```

### T9: Scale (Two-Hand)
```
TEST: Scale object with two-hand pinch
STEPS:
  1. Spawn an object
  2. Pinch with left hand on/near the object
  3. Pinch with right hand
  4. Spread hands apart (increase distance between pinch points)
  5. Bring hands together (decrease distance)
EXPECTED:
  - Object scales up when hands spread apart
  - Object scales down when hands come together
  - Scale is proportional to hand distance ratio
  - Scale is clamped to min/max (0.1x to 5.0x)
  - Particles and outline scale with the object
```

### T10: Delete (Swipe Off-Screen)
```
TEST: Swipe grabbed object off-screen to delete it
STEPS:
  1. Spawn an object
  2. Grab it (pinch)
  3. Make a fast swiping motion toward the edge of the screen
EXPECTED:
  - Object is removed from the scene
  - Object does not reappear
  - Other objects in scene are unaffected
```

### T11: Multiple Objects
```
TEST: Multiple objects coexist and can be independently manipulated
STEPS:
  1. Spawn a cube
  2. Move it to the left
  3. Spawn a sphere
  4. Move it to the right
  5. Grab only the cube
EXPECTED:
  - Both objects visible simultaneously
  - Only the nearest object to hand is grabbed
  - Other objects remain stationary when one is being manipulated
  - Each object has its own independent holographic effects
```

### T12: Save Project
```
TEST: Save current scene to localStorage
STEPS:
  1. Spawn 2-3 objects, position them
  2. Open menu (circle gesture)
  3. Point at "Save" and pinch
EXPECTED:
  - Scene is saved (can verify in browser DevTools → Application → localStorage)
  - Saved data includes object types, positions, rotations, scales
```

### T13: Load Project
```
TEST: Load a previously saved scene
STEPS:
  1. Save a scene with objects
  2. Open menu → select "New" (clear scene)
  3. Open menu → select "Load"
  4. Select the saved project
EXPECTED:
  - Scene is cleared on "New"
  - Project list appears on "Load"
  - On selecting a project: objects are recreated at their saved positions/rotations/scales
  - Holographic effects applied correctly to loaded objects
```

### T14: New Project
```
TEST: Start a fresh scene
STEPS:
  1. Spawn several objects
  2. Open menu → select "New"
EXPECTED:
  - All objects removed from scene
  - Scene is empty, ready for new objects
```

### T15: Hand Loss Recovery
```
TEST: App recovers gracefully when hands leave the view
STEPS:
  1. Grab an object
  2. Remove hand from camera view entirely
  3. Bring hand back
EXPECTED:
  - Object is released at last known position (not deleted, not frozen)
  - Hand tracking resumes when hand returns
  - No crash or stuck state
```

### T16: Performance
```
TEST: App runs at acceptable framerate
STEPS:
  1. Spawn 5 objects
  2. Interact with gestures
EXPECTED:
  - Maintains 30+ FPS (check via HUD FPS counter)
  - Hand tracking latency < 100ms perceived
  - No visible stutter during gestures
```

### T17: Window Resize
```
TEST: App handles window resize
STEPS:
  1. Resize browser window
EXPECTED:
  - Camera feed fills new viewport
  - Three.js canvas resizes correctly
  - Objects maintain correct relative positions
  - Menu remains functional
```

---

## Dependencies

```json
{
  "name": "magic-hands",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "three": "^0.170.0",
    "@mediapipe/tasks-vision": "^0.10.18"
  },
  "devDependencies": {
    "vite": "^6.0.0"
  }
}
```

---

## Notes & Decisions Log

| Date | Decision | Reason |
|------|----------|--------|
| 2026-04-04 | Web app (browser-based) | Works on webcam + phone cameras, no install |
| 2026-04-04 | MediaPipe Hands | Best browser-native hand tracking, free, 21 landmarks |
| 2026-04-04 | Three.js | Most mature WebGL lib, custom shader support |
| 2026-04-04 | Event Bus pattern | Decouples modules for parallel development |
| 2026-04-04 | One Euro Filter | Best smoothing filter for real-time noisy signals |
| 2026-04-04 | localStorage (not IndexedDB) | Simpler for MVP, sufficient for scene JSON |
| 2026-04-04 | No voice commands | Hand-only for MVP, voice planned for future |
| 2026-04-04 | No drag-and-drop models | Planned for future, not in initial build |
