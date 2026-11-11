import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// Dimensions from blender/build_museum.py, converted to three.js (Y up, exhibits facing +Z).
export const BAY_WIDTH = 3.2;
const CASE_Z = -0.2;
const DECK_Y = 0.965;
const SPECIMEN_Y = 1.1; // Where the eye should rest: the middle of a specimen on its riser.

const WARM = new THREE.Color("#ffc887");
const WARMER = new THREE.Color("#ffad5c");
// Tones tuned here rather than in Blender, so the hall's mood can be adjusted without re-exporting.
const TONES: Record<string, string> = { Plaster: "#d6c4a8", PlasterLight: "#dfcfb5", Linen: "#d2c2a4", OakGrain: "#e4d2bd", FloorOak: "#d9c3a8" };
const KEY_INTENSITY = 21;
const WASH_INTENSITY = 4.2;
const LIFT = 0.022; // How far a specimen rises on hover, in meters.

export type SceneExhibit = { specimen?: string; status: string };

export type LabelAnchor = { x: number; y: number; visible: boolean };

export type MuseumScene = {
  /** Continuous position along the hall: 0 is the first case, 1 the second, and so on. */
  setTarget(progress: number): void;
  setHighlight(index: number | null): void;
  setReducedMotion(reduced: boolean): void;
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

/** Loads the hall and resolves once the first frame is on screen. Throws if WebGL or the model fails. */
export async function createMuseumScene(options: Options): Promise<MuseumScene> {
  const { canvas, exhibits } = options;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true;
  // Variance shadows: soft edges like a diffused museum spot. PCF (with depth-compare samplers) logged
  // GL_INVALID_OPERATION sampler mismatches on Chrome's Metal backend with three r186, and PCFSoft is gone.
  renderer.shadowMap.type = THREE.VSMShadowMap;

  const scene = new THREE.Scene();
  const dusk = new THREE.Color("#241a12");
  scene.background = dusk;
  scene.fog = new THREE.Fog(dusk, 5.5, 12); // Bays beyond the next one fade into the dark hall.

  // A dim studio reflection for the glass and bronze, and a warm fill so nothing goes black.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environment;
  scene.environmentIntensity = 0.16;
  scene.add(new THREE.HemisphereLight("#ffd9a8", "#2e1f13", 0.12));

  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 30);

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

  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
  const glass = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    transparent: true,
    opacity: 0.09,
    roughness: 0.03,
    metalness: 0,
    envMapIntensity: 4,
    depthWrite: false,
  });
  source.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    if (node.name === "Glass") {
      node.material = glass; // One pane layer, no transmission: cheap, and the specimen stays clear.
      node.renderOrder = 2;
      return;
    }
    // Thin bronze posts would draw hard lines on the wall; the plinth and specimen carry the shadows.
    node.castShadow = !["Floor", "Wall", "Pilaster", "Frame"].includes(node.name);
    node.receiveShadow = true;
    const material = node.material as THREE.MeshStandardMaterial;
    if (material.map) material.map.anisotropy = maxAnisotropy; // Keeps the floor grain crisp at a glance.
    if (TONES[material.name]) material.color.set(TONES[material.name]);
  });

  // One bay per exhibit, plus one dark bay at each end so the hall doesn't stop at the frame.
  const keys: THREE.SpotLight[] = [];
  const specimens: (THREE.Object3D | null)[] = [];
  for (let i = -1; i <= exhibits.length; i++) {
    const bay = bayTemplate.clone(true);
    bay.position.x = i * BAY_WIDTH;
    scene.add(bay);
  }
  exhibits.forEach((exhibit, i) => {
    const x = i * BAY_WIDTH;
    const display = caseTemplate.clone(true);
    display.position.x = x;
    scene.add(display);

    const template = exhibit.specimen ? source.getObjectByName(exhibit.specimen) : undefined;
    const specimen = exhibit.status === "on-view" && template ? template.clone(true) : null;
    if (specimen) {
      specimen.position.x += x;
      specimen.userData.baseY = specimen.position.y;
      scene.add(specimen);
    }
    specimens.push(specimen);

    const key = new THREE.SpotLight(WARM, KEY_INTENSITY, 0, THREE.MathUtils.degToRad(22), 0.65, 2);
    key.position.set(x + 0.4, 2.8, 0.9);
    key.target.position.set(x, DECK_Y + 0.08, CASE_Z);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.8;
    key.shadow.camera.far = 5;
    key.shadow.bias = -0.0006;
    key.shadow.normalBias = 0.015;
    key.shadow.radius = 6;
    key.shadow.blurSamples = 12;
    scene.add(key, key.target);
    keys.push(key);

    const wash = new THREE.SpotLight("#ffc282", WASH_INTENSITY, 0, THREE.MathUtils.degToRad(30), 1, 2);
    wash.position.set(x, 3.3, 1.4);
    wash.target.position.set(x, 1.5, -1.05);
    scene.add(wash, wash.target);
  });

  // Hit boxes for hover: the glass case and its plinth.
  const boxes = exhibits.map((_, i) => {
    const x = i * BAY_WIDTH;
    return new THREE.Box3(new THREE.Vector3(x - 0.27, 0, CASE_Z - 0.27), new THREE.Vector3(x + 0.27, DECK_Y + 0.38, CASE_Z + 0.27));
  });

  // ---------------------------------------------------------------- camera rig

  let reduced = options.reducedMotion;
  let target = 0;
  let current = 0;
  let velocity = 0;
  let highlightIndex: number | null = null;
  const glow = exhibits.map(() => 0); // 0 to 1 per case, eased toward the highlight.
  let width = 1;
  let height = 1;
  const framing = { distance: 2.4, panX: 0, lookY: SPECIMEN_Y, height: 1.32 };

  function frame() {
    const aspect = width / height;
    camera.aspect = aspect;
    camera.fov = aspect < 0.8 ? 38 : 30;
    camera.updateProjectionMatrix();
    const halfV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const halfH = halfV * aspect;
    // Far enough back that the case and a margin fit the width.
    framing.distance = Math.max(2.3, 0.62 / halfH);
    const visibleHalfH = framing.distance * halfH;
    const visibleHalfV = framing.distance * halfV;
    if (aspect >= 0.8) {
      framing.panX = 0.17 * visibleHalfH; // Case left of center, label on the right.
      framing.lookY = SPECIMEN_Y - 0.02 * visibleHalfV;
    } else {
      framing.panX = 0;
      framing.lookY = SPECIMEN_Y - 0.36 * visibleHalfV; // Case in the upper half, label below.
    }
    framing.height = framing.lookY + 0.2;
  }

  const lookAt = new THREE.Vector3();
  function place() {
    const x = current * BAY_WIDTH + framing.panX;
    const lead = THREE.MathUtils.clamp(velocity * BAY_WIDTH * 0.05, -0.35, 0.35); // Look a touch ahead while walking.
    const drift = Math.min(Math.abs(velocity) * 0.18, 0.25); // And ease back a little, like a dolly.
    camera.position.set(x, framing.height, CASE_Z + framing.distance + drift);
    lookAt.set(x + lead, framing.lookY, CASE_Z);
    camera.lookAt(lookAt);
  }

  const anchorPoint = new THREE.Vector3();
  function anchors(): LabelAnchor[] {
    const portrait = width / height < 0.8;
    return exhibits.map((_, i) => {
      const x = i * BAY_WIDTH;
      anchorPoint.set(portrait ? x : x + 0.36, portrait ? DECK_Y - 0.05 : SPECIMEN_Y + 0.16, CASE_Z);
      anchorPoint.project(camera);
      return {
        x: (anchorPoint.x * 0.5 + 0.5) * width,
        y: (-anchorPoint.y * 0.5 + 0.5) * height,
        visible: anchorPoint.x > -1.6 && anchorPoint.x < 1.6,
      };
    });
  }

  /** Advances everything by dt seconds. Returns true while anything is still moving. */
  function update(dt: number) {
    let moving = false;
    const before = current;
    if (reduced) {
      current = target;
    } else {
      // Exponential damping: the same feel at 30, 60 or 120 frames per second.
      current += (target - current) * (1 - Math.exp(-5.5 * dt));
      if (Math.abs(target - current) < 0.0004) current = target;
    }
    velocity = dt > 0 ? (current - before) / dt : 0;
    if (current !== target) moving = true;

    glow.forEach((value, i) => {
      const goal = highlightIndex === i ? 1 : 0;
      const next = reduced ? goal : value + (goal - value) * (1 - Math.exp(-9 * dt));
      glow[i] = Math.abs(goal - next) < 0.002 ? goal : next;
      if (glow[i] !== goal) moving = true;
      keys[i].intensity = KEY_INTENSITY * (1 + 0.38 * glow[i]);
      keys[i].color.copy(WARM).lerp(WARMER, glow[i]);
      const specimen = specimens[i];
      if (specimen) specimen.position.y = specimen.userData.baseY + (reduced ? 0 : LIFT * glow[i]);
    });
    place();
    return moving;
  }

  // ---------------------------------------------------------------- render on demand

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
    if (moving) raf = requestAnimationFrame(tick);
  }
  function kick() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    frame();
    kick();
  }

  resize();
  update(0);
  if (options.frameLog) Object.assign(window, { __museum: { THREE, scene, renderer, camera } }); // Debug only (?debug).
  renderer.render(scene, camera);
  options.onFrame?.(anchors(), current);

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
      scene.traverse((node) => {
        if (node instanceof THREE.Mesh) node.geometry.dispose();
      });
      source.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return;
        const material = node.material as THREE.MeshStandardMaterial;
        material.map?.dispose();
        material.dispose();
      });
      glass.dispose();
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
