import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// Dimensions from blender/build_museum.py, converted to three.js (Y up, exhibits facing +Z).
export const BAY_WIDTH = 3.2;
const CASE_Z = -0.2;
const DECK_Y = 0.965;
const SPECIMEN_Y = 1.1; // Where the eye should rest: the middle of a specimen on its riser.
const WALL_Z = -1.0;
const WINDOW = { x: -1.03, width: 0.42, sill: 1.0, top: 2.07 };
const SCONCE = { x: 0.98, y: 1.79, z: -0.885 };

// The light: amber on the exhibit and the sconce, a cool evening window, and a blue-green room.
const AMBER = new THREE.Color("#ffb86b");
const AMBER_HOVER = new THREE.Color("#ffa04d");
const KEY_INTENSITY = 26;
const LIFT = 0.012; // How far a specimen rises on hover, in meters: enough to notice, still grounded.

// Each material's own tone, set here so the mood can be tuned without re-exporting from Blender.
const TONES: Record<string, { color: string; roughness?: number; metalness?: number }> = {
  PaintTeal: { color: "#8aa29a", roughness: 0.95 },
  PaintCream: { color: "#e6d6bb", roughness: 0.93 },
  OakGrain: { color: "#bc9a78", roughness: 0.58 }, // Waxed, not lacquered: no hot reflections of the window.
  Oak: { color: "#c9a27a", roughness: 0.55 },
  FloorOak: { color: "#9c8468", roughness: 0.62 },
  Bronze: { color: "#8a6a44", roughness: 0.42, metalness: 1 },
  Linen: { color: "#d8caae", roughness: 0.96 },
  SkullPlaster: { color: "#eee6d6", roughness: 0.8 },
  Clay: { color: "#b27c60", roughness: 0.88 },
  Leaf: { color: "#6e8a56", roughness: 0.6 },
  LeafLight: { color: "#88a46a", roughness: 0.6 },
};

export type SceneExhibit = { specimen?: string; status: string };

export type LabelAnchor = { x: number; y: number; visible: boolean };

export type MuseumScene = {
  /** Continuous position along the hall: 0 is the first case, 1 the second, and so on. */
  setTarget(progress: number): void;
  setHighlight(index: number | null): void;
  setReducedMotion(reduced: boolean): void;
  /** Whether the hall is on screen; ambient motion pauses when it isn't. */
  setVisible(visible: boolean): void;
  /** Which case is under this point of the canvas, if any. */
  pick(clientX: number, clientY: number): number | null;
  resize(): void;
  dispose(): void;
};

type Options = {
  canvas: HTMLCanvasElement;
  exhibits: SceneExhibit[];
  url: string;
  reducedMotion: boolean;
  onProgress?: (fraction: number) => void;
  /** Called after each rendered frame with each case's label anchor, in CSS pixels. */
  onFrame?: (anchors: LabelAnchor[], progress: number) => void;
  /** Frame times in ms, for measuring smoothness. Only collected when provided. */
  frameLog?: number[];
};

/** A soft round falloff, used for contact shadows under furniture and for dust motes. */
function radialTexture(inner: string, outer: string) {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(1, outer);
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// The area-light lookup tables are global; build them once, not on every mount.
let areaLightsReady = false;

/** Slow, irregular drift: two sines at unrelated rates, so nothing loops visibly. */
function drift(t: number, phase: number, rate: number) {
  return Math.sin(t * rate + phase) * 0.65 + Math.sin(t * rate * 2.37 + phase * 1.7) * 0.35;
}

/** Loads the hall and resolves once the first frame is on screen. Throws if WebGL or the model fails. */
export async function createMuseumScene(options: Options): Promise<MuseumScene> {
  const { canvas, exhibits } = options;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // AgX keeps amber light warm without pushing every lit surface toward orange.
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  // Variance shadows: soft edges like a diffused museum spot. PCF (with depth-compare samplers) logged
  // GL_INVALID_OPERATION sampler mismatches on Chrome's Metal backend with three r186, and PCFSoft is gone.
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.shadowMap.autoUpdate = false; // Shadows only redraw when something that casts them moves.
  if (!areaLightsReady) {
    RectAreaLightUniformsLib.init();
    areaLightsReady = true;
  }

  const scene = new THREE.Scene();
  const dusk = new THREE.Color("#222a29");
  scene.background = dusk;
  scene.fog = new THREE.Fog(dusk, 6.5, 15); // Distant bays settle into a cool evening hush.

  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environment;
  scene.environmentIntensity = 0.12; // Just enough for bronze and glass to catch a highlight.
  scene.add(new THREE.HemisphereLight("#a6c2c0", "#4d4034", 0.72)); // Blue-green room light from above.

  const camera = new THREE.PerspectiveCamera(31, 1, 0.05, 30);

  let source: THREE.Group;
  try {
    const gltf = await new GLTFLoader().loadAsync(options.url, (event) => {
      if (event.total) options.onProgress?.(event.loaded / event.total);
    });
    source = gltf.scene;
    if (!source.getObjectByName("Bay") || !source.getObjectByName("Case")) throw new Error("museum.glb is missing the Bay or Case node");
  } catch (error) {
    // Give the WebGL context back before the page switches to its still image.
    environment.dispose();
    pmrem.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    throw error;
  }
  const bayTemplate = source.getObjectByName("Bay")!;
  const caseTemplate = source.getObjectByName("Case")!;
  const fernTemplate = source.getObjectByName("Fern");

  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
  const glass = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    transparent: true,
    opacity: 0.06,
    roughness: 0.04,
    metalness: 0,
    envMapIntensity: 5,
    depthWrite: false,
  });
  const owned: { dispose(): void }[] = [glass];
  source.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const material = node.material as THREE.MeshStandardMaterial;
    if (node.name === "Glass") {
      node.material = glass; // One pane layer, no transmission: cheap, and the specimen stays clear.
      node.renderOrder = 2;
      return;
    }
    if (node.name === "WindowGlass") {
      // The evening sky, unlit: it reads as light coming in, not paint.
      const sky = new THREE.MeshBasicMaterial({ map: material.map, fog: false, toneMapped: false, side: THREE.DoubleSide });
      owned.push(sky);
      node.material = sky;
      return;
    }
    if (node.name === "SconceShade") {
      // A linen shade glowing from within: warmer and a step darker than the wall, so it reads as a lamp.
      const shade = new THREE.MeshStandardMaterial({ color: "#d9b98a", emissive: "#ff9a3c", emissiveIntensity: 1.35, roughness: 0.9, side: THREE.DoubleSide });
      owned.push(shade);
      node.material = shade;
      return;
    }
    // A mesh with two materials loads as a group of meshes named after its data (the Wall is "Cube" and
    // "Cube_1"), so check the parent's name too.
    const names = [node.name, node.parent?.name ?? ""];
    const quiet = ["Floor", "Wall", "Pilaster", "Frame", "Wainscot", "Soil"];
    node.castShadow = !names.some((name) => name.startsWith("Frond") || quiet.includes(name));
    node.receiveShadow = true;
    if (material.map) material.map.anisotropy = maxAnisotropy; // Keeps grain crisp at a glance.
    const tone = TONES[material.name];
    if (tone) {
      material.color.set(tone.color);
      if (tone.roughness !== undefined) material.roughness = tone.roughness;
      if (tone.metalness !== undefined) material.metalness = tone.metalness;
    }
  });

  // Soft contact shadows, so furniture and pots sit on the floor instead of hovering over it.
  const contactTexture = radialTexture("rgba(20,16,12,0.62)", "rgba(20,16,12,0)");
  const contactMaterial = new THREE.MeshBasicMaterial({ map: contactTexture, transparent: true, depthWrite: false, fog: false });
  const contactGeometry = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  owned.push(contactTexture, contactMaterial, contactGeometry);
  function contact(x: number, z: number, size: number, y = 0.002) {
    const shadow = new THREE.Mesh(contactGeometry, contactMaterial);
    shadow.position.set(x, y, z);
    shadow.scale.set(size, 1, size);
    shadow.renderOrder = 1;
    scene.add(shadow);
  }

  // Ferns: one on each window sill, and a big one between bays in the foreground for depth as you walk.
  type Swaying = { node: THREE.Object3D; base: THREE.Euler; phase: number; rate: number; amount: number };
  const swaying: Swaying[] = [];
  function placeFern(x: number, y: number, z: number, scale: number, seed: number) {
    if (!fernTemplate) return;
    const fern = fernTemplate.clone(true);
    fern.position.set(x, y, z);
    fern.scale.setScalar(scale);
    fern.rotation.y = seed * 1.3;
    scene.add(fern);
    fern.traverse((node) => {
      if (!node.name.startsWith("Frond")) return;
      swaying.push({
        node,
        base: node.rotation.clone(),
        phase: seed * 3.1 + swaying.length * 1.7,
        rate: 0.35 + ((swaying.length * 37) % 10) / 40,
        amount: 0.022 + ((swaying.length * 13) % 7) / 600,
      });
    });
    contact(x, z, 0.32 * scale, y + 0.002);
  }

  // One bay per exhibit, plus one at each end so the hall doesn't stop at the frame.
  const keys: THREE.SpotLight[] = [];
  const specimens: (THREE.Object3D | null)[] = [];
  for (let i = -1; i <= exhibits.length; i++) {
    const x = i * BAY_WIDTH;
    const bay = bayTemplate.clone(true);
    bay.position.x = x;
    scene.add(bay);
    if (fernTemplate) {
      placeFern(x + WINDOW.x, WINDOW.sill, WALL_Z - 0.05, 1, i + 2);
      if (i < exhibits.length) placeFern(x + BAY_WIDTH / 2, 0, 0.55, 2.5, i + 7); // Foreground, between this bay and the next.
    }

    // Cool evening light through the window, washing the sill, the wall beside it and the floor.
    const windowLight = new THREE.RectAreaLight("#9fc2cf", 3.2, WINDOW.width, WINDOW.top - WINDOW.sill);
    windowLight.position.set(x + WINDOW.x, (WINDOW.sill + WINDOW.top) / 2, WALL_Z + 0.04);
    windowLight.lookAt(x + WINDOW.x + 0.5, 0.2, 1.6);
    scene.add(windowLight);

    // The sconce: a small warm pool on the wall above the label.
    const sconce = new THREE.PointLight("#ffc184", 0.9, 2.4, 2);
    sconce.position.set(x + SCONCE.x, SCONCE.y, SCONCE.z + 0.05);
    scene.add(sconce);
  }

  const dustTexture = radialTexture("rgba(255,236,205,1)", "rgba(255,236,205,0)");
  owned.push(dustTexture);
  const dust: { points: THREE.Points; seeds: Float32Array; origin: THREE.Vector3 }[] = [];

  exhibits.forEach((exhibit, i) => {
    const x = i * BAY_WIDTH;
    const display = caseTemplate.clone(true);
    display.position.x = x;
    scene.add(display);
    contact(x, CASE_Z, 0.95);

    const template = exhibit.specimen ? source.getObjectByName(exhibit.specimen) : undefined;
    const specimen = exhibit.status === "on-view" && template ? template.clone(true) : null;
    if (specimen) {
      specimen.position.x += x;
      specimen.userData.baseY = specimen.position.y;
      scene.add(specimen);
    }
    specimens.push(specimen);

    // The exhibit light: a tight amber spot from above and to the right, with soft shadows.
    const key = new THREE.SpotLight(AMBER, KEY_INTENSITY, 0, THREE.MathUtils.degToRad(17), 0.7, 2);
    key.position.set(x + 0.45, 2.85, 0.75);
    key.target.position.set(x, DECK_Y + 0.08, CASE_Z);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.8;
    key.shadow.camera.far = 5;
    key.shadow.bias = -0.0006;
    key.shadow.normalBias = 0.015;
    key.shadow.radius = 7;
    key.shadow.blurSamples = 12;
    scene.add(key, key.target);
    keys.push(key);

    // Sparse dust drifting in that beam: about forty motes, only visible where the light catches them.
    const count = 28;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 4);
    for (let n = 0; n < count; n++) {
      seeds.set([Math.random(), Math.random(), Math.random(), Math.random()], n * 4);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(count * 3), 3)); // Per-mote fade.
    const material = new THREE.PointsMaterial({
      map: dustTexture,
      color: "#ffe0b5",
      vertexColors: true,
      size: 0.008,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    owned.push(geometry, material);
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    scene.add(points);
    dust.push({ points, seeds, origin: new THREE.Vector3(x + 0.22, 1.25, CASE_Z + 0.35) });
  });

  /** Moves each mote along the beam from the lamp down toward the case, drifting slowly sideways. */
  function updateDust(time: number) {
    for (const { points, seeds, origin } of dust) {
      const position = points.geometry.attributes.position as THREE.BufferAttribute;
      const color = points.geometry.attributes.color as THREE.BufferAttribute;
      for (let n = 0; n < position.count; n++) {
        const [a, b, c, d] = [seeds[n * 4], seeds[n * 4 + 1], seeds[n * 4 + 2], seeds[n * 4 + 3]];
        const along = (a + time * (0.006 + d * 0.006)) % 1; // 0 near the lamp, 1 near the case
        const fade = Math.sin(Math.PI * along); // Fades in and out, so a mote never pops when it wraps.
        color.setXYZ(n, fade, fade, fade);
        const spread = 0.05 + along * 0.16;
        position.setXYZ(
          n,
          origin.x + 0.2 * (1 - along) + drift(time * 0.2, b * 20, 0.5) * spread * (b - 0.5) * 2,
          origin.y + 1.3 * (1 - along) - 0.15 + drift(time * 0.15, c * 20, 0.4) * 0.02,
          origin.z + 0.5 * (1 - along) + drift(time * 0.18, d * 20, 0.45) * spread * (c - 0.5) * 2,
        );
      }
      position.needsUpdate = true;
      color.needsUpdate = true;
    }
  }
  updateDust(0); // Place the motes before the first frame, even if they never move (reduced motion).

  // Hit boxes for hover: the glass case and its cabinet.
  const boxes = exhibits.map((_, i) => {
    const x = i * BAY_WIDTH;
    return new THREE.Box3(new THREE.Vector3(x - 0.27, 0, CASE_Z - 0.27), new THREE.Vector3(x + 0.27, DECK_Y + 0.38, CASE_Z + 0.27));
  });

  // ---------------------------------------------------------------- camera rig

  let reduced = options.reducedMotion;
  let visible = true;
  let target = 0;
  let current = 0;
  let velocity = 0;
  let time = 0;
  let highlightIndex: number | null = null;
  const glow = exhibits.map(() => 0); // 0 to 1 per case, eased toward the highlight.
  let width = 1;
  let height = 1;
  const framing = { distance: 2.75, panX: 0, lookY: SPECIMEN_Y, height: 1.4 };

  function frame() {
    const aspect = width / height;
    camera.aspect = aspect;
    camera.fov = aspect < 0.8 ? 40 : 31;
    camera.updateProjectionMatrix();
    const halfV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const halfH = halfV * aspect;
    // Far enough back to see the cabinet, the window beside it and the sconce above the label.
    framing.distance = Math.max(2.75, 0.62 / halfH);
    const visibleHalfH = framing.distance * halfH;
    const visibleHalfV = framing.distance * halfV;
    if (aspect >= 0.8) {
      framing.panX = 0.1 * visibleHalfH; // Case a little left of center: window at left, label at right.
      framing.lookY = 1.06;
    } else {
      framing.panX = 0;
      framing.lookY = SPECIMEN_Y - 0.34 * visibleHalfV; // Case in the upper half, label below.
    }
    framing.height = framing.lookY + 0.3;
  }

  const lookAt = new THREE.Vector3();
  function place() {
    const x = current * BAY_WIDTH + framing.panX;
    // A touch of lead in the direction of travel, no zoom and no roll: the eye arrives slightly first.
    const lead = THREE.MathUtils.clamp(velocity * BAY_WIDTH * 0.03, -0.18, 0.18);
    camera.position.set(x, framing.height, CASE_Z + framing.distance);
    lookAt.set(x + lead, framing.lookY, CASE_Z);
    camera.lookAt(lookAt);
  }

  const anchorPoint = new THREE.Vector3();
  function anchors(): LabelAnchor[] {
    const portrait = width / height < 0.8;
    return exhibits.map((_, i) => {
      const x = i * BAY_WIDTH;
      anchorPoint.set(portrait ? x : x + 0.38, portrait ? DECK_Y - 0.05 : SPECIMEN_Y + 0.14, CASE_Z);
      anchorPoint.project(camera);
      return {
        x: (anchorPoint.x * 0.5 + 0.5) * width,
        y: (-anchorPoint.y * 0.5 + 0.5) * height,
        visible: anchorPoint.x > -1.6 && anchorPoint.x < 1.6,
      };
    });
  }

  /** Advances everything by dt seconds. Returns true while the camera or a highlight is still moving. */
  function update(dt: number) {
    let moving = false;
    const before = current;
    if (reduced) {
      current = target;
    } else {
      // Exponential damping: the same feel at 30, 60 or 120 frames per second, and no overshoot.
      current += (target - current) * (1 - Math.exp(-6 * dt));
      if (Math.abs(target - current) < 0.0004) current = target;
    }
    velocity = dt > 0 ? (current - before) / dt : 0;
    if (current !== target) moving = true;

    let lifting = false;
    glow.forEach((value, i) => {
      const goal = highlightIndex === i ? 1 : 0;
      const next = reduced ? goal : value + (goal - value) * (1 - Math.exp(-7 * dt));
      glow[i] = Math.abs(goal - next) < 0.002 ? goal : next;
      if (glow[i] !== goal) moving = lifting = true;
      keys[i].intensity = KEY_INTENSITY * (1 + 0.32 * glow[i]);
      keys[i].color.copy(AMBER).lerp(AMBER_HOVER, glow[i] * 0.6);
      const specimen = specimens[i];
      if (specimen) specimen.position.y = specimen.userData.baseY + (reduced ? 0 : LIFT * glow[i]);
    });
    if (lifting && !reduced) renderer.shadowMap.needsUpdate = true; // The specimen's shadow follows it up.

    if (!reduced) {
      time += dt;
      for (const leaf of swaying) {
        leaf.node.rotation.x = leaf.base.x + drift(time, leaf.phase, leaf.rate) * leaf.amount;
        leaf.node.rotation.z = leaf.base.z + drift(time, leaf.phase + 2.1, leaf.rate * 0.8) * leaf.amount * 0.7;
      }
      updateDust(time);
    }
    place();
    return moving;
  }

  // ---------------------------------------------------------------- render loop

  // Runs continuously while the hall is on screen (the room breathes a little), and only on demand
  // with reduced motion, when nothing moves unless the visitor moves it.
  const ambient = () => !reduced && visible && document.visibilityState === "visible";
  let raf = 0;
  let last = 0;
  function tick(now: number) {
    raf = 0;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    const moving = update(dt);
    renderer.render(scene, camera);
    options.onFrame?.(anchors(), current);
    if (options.frameLog) options.frameLog.push(dt * 1000);
    if (moving || ambient()) raf = requestAnimationFrame(tick);
  }
  function kick() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }
  const onVisibility = () => kick();
  document.addEventListener("visibilitychange", onVisibility);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    frame();
    kick();
  }

  const showDust = () => dust.forEach(({ points }) => (points.visible = !reduced));
  showDust();
  resize();
  update(0);
  if (options.frameLog) Object.assign(window, { __museum: { THREE, scene, renderer, camera } }); // Debug only (?debug).
  renderer.shadowMap.needsUpdate = true;
  renderer.render(scene, camera);
  options.onFrame?.(anchors(), current);
  kick();

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const hit = new THREE.Vector3();

  return {
    setTarget(progress) {
      target = THREE.MathUtils.clamp(progress, 0, exhibits.length - 1);
      kick();
    },
    setHighlight(index) {
      highlightIndex = index;
      kick();
    },
    setReducedMotion(value) {
      reduced = value;
      showDust();
      renderer.shadowMap.needsUpdate = true;
      kick();
    },
    setVisible(value) {
      visible = value;
      kick();
    },
    pick(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const index = boxes.findIndex((box) => raycaster.ray.intersectBox(box, hit));
      return index === -1 ? null : index;
    },
    resize,
    dispose() {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      scene.traverse((node) => {
        if (node instanceof THREE.Mesh) node.geometry.dispose();
      });
      source.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return;
        const material = node.material as THREE.MeshStandardMaterial;
        material.map?.dispose();
        material.dispose();
      });
      owned.forEach((item) => item.dispose());
      environment.dispose();
      pmrem.dispose();
      // No forceContextLoss here: in development React mounts twice and the next scene reuses this canvas's context.
      renderer.dispose();
    },
  };
}
