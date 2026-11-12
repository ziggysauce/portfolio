import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// Dimensions from blender/build_museum.py, converted to three.js (Y up, exhibits facing +Z).
export const BAY_WIDTH = 2.6;
const CASE_Z = -0.2;
const DECK_Y = 0.825;
const SPECIMEN_Y = 0.96; // Where the eye should rest: the middle of a specimen on its riser.
const WALL_Z = -1.0;
const WINDOW = { x: -0.94, width: 0.36, sill: 1.0, top: 2.04 };
const SCONCE = { x: 1.0, y: 1.63, z: -0.885 };
// The squat cabinet runs wider on the right (a shelf for the curator's things); its drawer slides out.
const CABINET = { x0: -0.32, x1: 0.54 };
// 006's case is wider and symmetric (blender WIDE_X0/X1, plus the base moulding).
const WIDE_CABINET = { x0: -0.45, x1: 0.45 };
// The fatherhood plinth: under the desk bay's window, between case 006 and the desk.
const PLINTH = { x: WINDOW.x, z: -0.765, top: 0.655, recess: 0.6475, front: 0.135 }; // front: the body's half depth
const DRAWER = { x0: -0.245, x1: 0.465, y0: 0.555, y1: 0.695, front: 0.074, travel: 0.17 };

// The light: a broad warm key on the exhibit, a warm sconce, a cool evening window, a blue-green room.
// The key is warm white rather than orange, so cream stays cream and the room keeps its own colors.
const AMBER = new THREE.Color("#ffd2a0");
const AMBER_HOVER = new THREE.Color("#ffbf80");
const KEY_INTENSITY = 30;
const ENV_INTENSITY = 0.12; // Room reflections: just enough for brass and glass to catch a highlight.
const LIFT = 0.012; // How far a specimen rises on hover, in meters: enough to notice, still grounded.

// Each material's own tone, set here so the mood can be tuned without re-exporting from Blender.
// Each surface responds differently: chalky paint, waxed oak with grain-led roughness, warm brass,
// matte plaster. Keys are base material names; baked copies (such as "OakGrain.cabinet") share them.
// `env` scales the room's reflected and ambient light (ENV_INTENSITY): under 1 for matte surfaces, which
// deepens the room around the lit exhibit; over 1 for brass and glass, which should catch it.
type Tone = { color: string; roughness?: number; metalness?: number; env?: number; grainRoughness?: boolean; quiet?: boolean };
const TONES: Record<string, Tone> = {
  PaintTeal: { color: "#86a097", roughness: 1, env: 0.5 },
  PaintCream: { color: "#e2d2b6", roughness: 1, env: 0.5 },
  // Waxed oak. Roughness comes from the grain texture, which samples at about 0.37 to 0.43 in linear
  // color, so the factor sits well above 1: the result lands at about 0.9 to 1, matte, grain-led.
  OakGrain: { color: "#b3967a", roughness: 2.4, grainRoughness: true, env: 0.55 },
  Oak: { color: "#b3967a", roughness: 2.4, grainRoughness: true, env: 0.55 },
  FloorOak: { color: "#a48d75", roughness: 2.4, grainRoughness: true, env: 0.55 },
  // Props and the desk: the same oak with its grain turned down and a satin finish, so small near pieces
  // read as one soft, waxed surface instead of carrying loud repeated stripes.
  OakProp: { color: "#b0957c", roughness: 1, grainRoughness: true, quiet: true, env: 0.85 },
  Bronze: { color: "#b09257", roughness: 0.36, metalness: 1, env: 1.6 }, // Brass: yellower than copper, softly polished.
  Linen: { color: "#d8caae", roughness: 1, env: 0.5 },
  IvoryLining: { color: "#efe6d4", roughness: 0.95, env: 0.6 }, // The fatherhood plinth's recess.
  // Plaster with a broad satin sheen, so the key light describes the cast's curvature (benchmark, 2026-11-12).
  SkullPlaster: { color: "#e6dac5", roughness: 0.58, env: 0.8 }, // Warm ivory.
  Rug: { color: "#f4ece0", roughness: 1, env: 0.45 },
  Paper: { color: "#efe6d2", roughness: 0.9, env: 0.5 },
  NotePaper: { color: "#ffffff", roughness: 0.9, env: 0.5 },
  NotebookKraft: { color: "#a5835a", roughness: 0.85, env: 0.5 },
  NotebookSage: { color: "#6f8578", roughness: 0.85, env: 0.5 },
  Pencil: { color: "#c9a04a", roughness: 0.5, env: 0.8 },
  Cedar: { color: "#d7b08a", roughness: 0.8, env: 0.5 },
  MugGlaze: { color: "#6f8798", roughness: 0.28, env: 1.4 }, // Glazed stoneware: a soft highlight, no mirror.
  Coffee: { color: "#2a1a10", roughness: 0.12, env: 1.2 },
  // Exhibits 002 to 006 and the desk.
  SampleGlass: { color: "#e8eef0", roughness: 0.08, env: 2.4 }, // Clear and a little bright at the edges.
  Ruby: { color: "#8a2d34", roughness: 0.25, env: 1.1 }, // Restrained, not red paint.
  Stopper: { color: "#a98a64", roughness: 0.75, env: 0.5 }, // cork
  SampleLabel: { color: "#f1e8d6", roughness: 0.85, env: 0.5 },
  SlideGlass: { color: "#eef2f0", roughness: 0.06, env: 2.4 },
  Bezel: { color: "#2b2c2e", roughness: 0.45, env: 1 },
  Keycap: { color: "#ece6d8", roughness: 0.5, env: 0.8 },
  KeycapAccent: { color: "#6f8578", roughness: 0.5, env: 0.8 },
  Aluminium: { color: "#c3c5c4", roughness: 0.35, metalness: 1, env: 1.4 },
  Trackpad: { color: "#b3b6b6", roughness: 0.3, metalness: 1, env: 1.2 },
  LaptopKey: { color: "#303133", roughness: 0.5, env: 0.8 },
  Whiteboard: { color: "#ffffff", roughness: 0.3, env: 0.8 },
  MarkerBody: { color: "#ece6da", roughness: 0.4, env: 0.8 },
  MarkerCap: { color: "#9a4436", roughness: 0.4, env: 0.8 },
  Felt: { color: "#2f3a52", roughness: 1, env: 0.4 },
  Cork: { color: "#ffffff", roughness: 0.95, env: 0.45 },
  PlanCard: { color: "#ffffff", roughness: 0.9, env: 0.5 },
  CodeCard: { color: "#ffffff", roughness: 0.9, env: 0.5 },
  TabSage: { color: "#8fa38f", roughness: 0.8, env: 0.5 },
  TabRust: { color: "#b9775c", roughness: 0.8, env: 0.5 },
  TabSlate: { color: "#7488a0", roughness: 0.8, env: 0.5 },
  Thread: { color: "#9c4a3c", roughness: 0.8, env: 0.5 },
  CalendarPage: { color: "#ffffff", roughness: 0.9, env: 0.5 },
  CalendarBoard: { color: "#4c5256", roughness: 0.7, env: 0.7 },
  CastIron: { color: "#2a2928", roughness: 0.55, metalness: 0.6, env: 1.3 }, // Seasoned: a dull sheen.
  RecordSleeve: { color: "#ffffff", roughness: 0.85, env: 0.5 },
  Vinyl: { color: "#ffffff", roughness: 0.35, env: 1.4 }, // Grooves catch a soft highlight.
  Leatherette: { color: "#2c2b29", roughness: 0.85, env: 0.6 },
  LensGlass: { color: "#1b2228", roughness: 0.08, env: 2 },
  PlaqueInk: { color: "#2a2520", roughness: 0.7, env: 0.5 },
  BookOat: { color: "#cdbf9f", roughness: 0.8, env: 0.5 },
  BookSlate: { color: "#56646e", roughness: 0.8, env: 0.5 },
  BookOlive: { color: "#7b7a52", roughness: 0.8, env: 0.5 },
  Leather: { color: "#3e5a4a", roughness: 0.6, env: 0.6 },
  LeafletCream: { color: "#efe4c8", roughness: 0.9, env: 0.5 },
  LeafletSage: { color: "#a9b9a2", roughness: 0.9, env: 0.5 },
  LeafletRose: { color: "#d6a88f", roughness: 0.9, env: 0.5 },
  Ceramic: { color: "#ddd3c2", roughness: 0.35, env: 1 },
  LeafDark: { color: "#4f6b4a", roughness: 0.55 },
  BookTerracotta: { color: "#a4573f", roughness: 0.8, env: 0.5 },
  BookTeal: { color: "#3f6466", roughness: 0.8, env: 0.5 },
  BookMustard: { color: "#c19a45", roughness: 0.8, env: 0.5 },
  Clay: { color: "#b27c60", roughness: 0.88 },
  Leaf: { color: "#6e8a56", roughness: 0.6 },
  LeafLight: { color: "#88a46a", roughness: 0.6 },
};

/** A stop on the walk: a case with a specimen, or the Information desk at the end. */
export type SceneExhibit = { specimen?: string; status: string; kind?: "case" | "desk" };

/** Where a case's label goes and where its drawer front is, in CSS pixels. */
export type LabelAnchor = {
  x: number;
  y: number;
  visible: boolean;
  drawer: { x: number; y: number };
  /** Where the specimen's own caption (an HTML plaque or tag) is pinned, if it has one. */
  caption: { x: number; y: number; visible: boolean } | null;
};

/** Where the fatherhood plinth's card goes, in CSS pixels, and how much of it shows (0 when out of view). */
export type PlinthAnchor = { x: number; y: number; opacity: number };

export type MuseumScene = {
  /** Continuous position along the hall: 0 is the first case, 1 the second, and so on. */
  setTarget(progress: number): void;
  setHighlight(index: number | null): void;
  setReducedMotion(reduced: boolean): void;
  /** Whether the hall is on screen; ambient motion pauses when it isn't. */
  setVisible(visible: boolean): void;
  /** Which case is under this point of the canvas, if any. */
  pick(clientX: number, clientY: number): number | null;
  /** Which case's drawer front is under this point, if any. */
  pickDrawer(clientX: number, clientY: number): number | null;
  /** Slides a case's drawer open or shut. The specimen reacts once when a visitor opens it. */
  setDrawer(index: number, open: boolean): void;
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
  onFrame?: (anchors: LabelAnchor[], progress: number, plinth: PlinthAnchor) => void;
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

/** The benchmark's waxed oak (case 1's cabinet and riser): a satin finish whose roughness follows the
 *  grain only gently and stays in a narrow band, so rounded edges catch one broad highlight and the
 *  darkest grain lines never turn glossy. The grain samples at about 0.37 to 0.43 in linear color. */
function satinOak(shader: { fragmentShader: string }) {
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <roughnessmap_fragment>",
    "#include <roughnessmap_fragment>\n\troughnessFactor = clamp(0.5 + (texelRoughness.g - 0.4) * 2.4, 0.44, 0.62);",
  );
}

/** Prop oak: satinOak's finish, with the grain's contrast in color pulled halfway toward its own average
 *  (the texture's smallest mip), so the wood stays warm and varied but quiet. */
function quietOak(shader: { fragmentShader: string }) {
  satinOak(shader);
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <map_fragment>",
    "#include <map_fragment>\n\tdiffuseColor.rgb = mix(diffuse * textureLod(map, vMapUv, 12.0).rgb, diffuseColor.rgb, 0.45);",
  );
}

/** Keeps waxed oak from going glossy where its grain map is darkest. */
function floorRoughness(shader: { fragmentShader: string }) {
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <roughnessmap_fragment>",
    "#include <roughnessmap_fragment>\n\troughnessFactor = max(roughnessFactor, 0.74);",
  );
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
  renderer.toneMappingExposure = 1.22; // Lifted a touch with the floor in view: welcoming, not dim.
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
  scene.environmentIntensity = ENV_INTENSITY; // The base level; each tone scales it below.
  // A material that borrows scene.environment always gets scene.environmentIntensity (three overrides
  // envMapIntensity), so toned materials take the map directly to keep their own reflection strength.
  const reflect = (material: THREE.MeshStandardMaterial, strength: number) => {
    material.envMap = environment;
    material.envMapIntensity = ENV_INTENSITY * strength;
  };
  // Blue-green room light from above, a warmer bounce from the floor. Lower than before, for depth.
  scene.add(new THREE.HemisphereLight("#9db9b7", "#5c4a39", 0.52));

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
  const wideTemplate = source.getObjectByName("CaseWide") ?? caseTemplate;
  const plinthTemplate = source.getObjectByName("Plinth");
  /** A part of a case by name. 006's wide case names its parts with a "Wide" suffix. */
  const part = (root: THREE.Object3D, name: string) => root.getObjectByName(name) ?? root.getObjectByName(`${name}Wide`);
  const baseName = (name: string) => name.replace(/Wide$/, "");
  const deskTemplate = source.getObjectByName("Desk");
  const propsTemplate = source.getObjectByName("Props");

  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
  const glass = new THREE.MeshStandardMaterial({
    name: "CaseGlass",
    color: "#ffffff",
    transparent: true,
    opacity: 0.03,
    roughness: 0.03,
    metalness: 0,
    depthWrite: false,
    side: THREE.DoubleSide, // The camera stands between the side panes, so they're seen from inside.
  });
  reflect(glass, 3.5);
  // Fresnel: almost invisible face-on, a soft sheen where a pane turns away from the eye. That's
  // what makes glass read as glass without veiling the specimen.
  glass.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `float glassFacing = abs(dot(normalize(vViewPosition), normal));
      diffuseColor.a = clamp(diffuseColor.a + pow(1.0 - glassFacing, 3.0) * 0.32, 0.0, 0.4);
      #include <opaque_fragment>`,
    );
  };
  const owned: { dispose(): void }[] = [glass];
  source.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const material = node.material as THREE.MeshStandardMaterial;
    const name = baseName(node.name);
    if (name === "Glass") {
      node.material = glass; // One pane layer, no transmission: cheap, and the specimen stays clear.
      node.renderOrder = 2;
      return;
    }
    if (node.name === "WindowGlass") {
      // The evening sky, unlit: it reads as light coming in, not paint.
      const sky = new THREE.MeshBasicMaterial({ name: "EveningSky", map: material.map, fog: false, toneMapped: false, side: THREE.DoubleSide });
      owned.push(sky);
      node.material = sky;
      return;
    }
    if (name === "Screen" || name === "LaptopScreen") {
      // The first KDS mid-service, and 004's code review: a screen gives its own light, a little dimmer
      // than paper under the lamp.
      const screen = new THREE.MeshBasicMaterial({ name: material.name, map: material.map, color: "#d9d9d9" });
      owned.push(screen);
      node.material = screen;
      return;
    }
    if (node.name === "LampShade") {
      // The banker's lamp's green glass: glossy, so the room draws soft highlights along its dome, with a
      // faint glow of the bulb coming through it.
      const shade = new THREE.MeshStandardMaterial({ name: "LampGlass", color: "#245c40", roughness: 0.14, metalness: 0, emissive: "#1d4a33", emissiveIntensity: 0.35, side: THREE.DoubleSide });
      reflect(shade, 2.2);
      owned.push(shade);
      node.material = shade;
      return;
    }
    if (node.name === "LampLining") {
      // Its opal lining, lit by the bulb: the warm glow under the shade.
      const lining = new THREE.MeshBasicMaterial({ name: "LampLining", color: "#f7ddb0", toneMapped: false, side: THREE.DoubleSide });
      owned.push(lining);
      node.material = lining;
      node.castShadow = false;
      return;
    }
    if (node.name === "SconceShade") {
      // A linen shade glowing from within: warmer and a step darker than the wall, so it reads as a lamp.
      // Parchment lit from inside. It's a light source, so it skips tone mapping: AgX desaturates bright
      // orange toward tan, and a glowing shade should land exactly as warm as chosen here.
      const shade = new THREE.MeshBasicMaterial({ name: "SconceShade", color: "#f6cf98", toneMapped: false, fog: false, side: THREE.DoubleSide });
      owned.push(shade);
      node.material = shade;
      return;
    }
    // A mesh with two materials loads as a group of meshes named after its data (the Wall is "Cube" and
    // "Cube_1"), so check the parent's name too.
    const names = [name, baseName(node.parent?.name ?? "")];
    const quiet = ["Floor", "Rug", "Wall", "Pilaster", "Frame", "Wainscot", "Soil", "Coffee"];
    node.castShadow = !names.some((name) => name.startsWith("Frond") || quiet.includes(name));
    node.receiveShadow = true;
    if (material.map) material.map.anisotropy = maxAnisotropy; // Keeps grain crisp at a glance.
    const tone = TONES[material.name.split(".")[0]];
    if (tone) {
      material.color.set(tone.color);
      if (tone.roughness !== undefined) material.roughness = tone.roughness;
      if (tone.metalness !== undefined) material.metalness = tone.metalness;
      if (tone.env !== undefined) reflect(material, tone.env);
      // The grain texture doubles as a roughness map: denser grain reads a touch rougher than the flats.
      // Floored, so the darkest grain lines don't turn glossy and catch the window lights at a glance.
      if (tone.grainRoughness && material.map) {
        material.roughnessMap = material.map;
        material.onBeforeCompile = tone.quiet ? quietOak : floorRoughness;
      }
    }
  });

  // Soft contact shadows, so furniture and pots sit on the floor instead of hovering over it.
  const contactTexture = radialTexture("rgba(20,16,12,0.62)", "rgba(20,16,12,0)");
  const contactMaterial = new THREE.MeshBasicMaterial({ map: contactTexture, transparent: true, depthWrite: false, fog: false });
  const contactGeometry = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  owned.push(contactTexture, contactMaterial, contactGeometry);
  const deckContactMaterial = new THREE.MeshBasicMaterial({ map: contactTexture, transparent: true, opacity: 0.55, depthWrite: false, fog: false });
  const seatMaterial = new THREE.MeshBasicMaterial({ map: contactTexture, transparent: true, opacity: 0.85, depthWrite: false, fog: false });
  owned.push(deckContactMaterial, seatMaterial);
  function contact(x: number, z: number, size: number, y = 0.002, depth = size) {
    const shadow = new THREE.Mesh(contactGeometry, contactMaterial);
    shadow.position.set(x, y, z);
    shadow.scale.set(size, 1, depth);
    shadow.renderOrder = 1;
    scene.add(shadow);
  }

  // The sconce's wall glow: two soft lobes, a tighter one up and a wider one down.
  function spillTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 512;
    const context = canvas.getContext("2d")!;
    const lobe = (cy: number, radius: number, squeeze: number, alpha: number) => {
      context.save();
      context.translate(128, cy);
      context.scale(squeeze, 1);
      const gradient = context.createRadialGradient(0, 0, 0, 0, 0, radius);
      gradient.addColorStop(0, `rgba(255,178,104,${alpha})`);
      gradient.addColorStop(0.4, `rgba(255,160,88,${alpha * 0.42})`);
      gradient.addColorStop(1, "rgba(255,150,80,0)");
      context.fillStyle = gradient;
      context.fillRect(-radius, -radius, radius * 2, radius * 2);
      context.restore();
    };
    lobe(170, 150, 0.42, 0.55); // up, through the narrow top of the shade
    lobe(330, 200, 0.62, 0.7); // down, through the wide bottom
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
  const spillMap = spillTexture();
  const spillMaterial = new THREE.MeshBasicMaterial({ map: spillMap, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const spillGeometry = new THREE.PlaneGeometry(0.62, 1.24);
  owned.push(spillMap, spillMaterial, spillGeometry);

  // The room's dressing varies bay by bay, so walking the hall never shows the same corner twice: a
  // different thing on each window sill, and a plant between every other pair of bays.
  type Swaying = { node: THREE.Object3D; base: THREE.Euler; phase: number; rate: number; amount: number };
  const swaying: Swaying[] = [];
  function dress(name: string, x: number, y: number, z: number, scale: number, seed: number, footprint: number) {
    const template = source.getObjectByName(name);
    if (!template) return;
    const item = template.clone(true);
    item.position.set(x, y, z);
    item.scale.setScalar(scale);
    item.rotation.y = seed * 1.3;
    scene.add(item);
    item.traverse((node) => {
      if (!node.name.startsWith("Frond")) return;
      swaying.push({
        node,
        base: node.rotation.clone(),
        phase: seed * 3.1 + swaying.length * 1.7,
        rate: 0.35 + ((swaying.length * 37) % 10) / 40,
        amount: 0.022 + ((swaying.length * 13) % 7) / 600,
      });
    });
    contact(x, z, footprint * scale, y + 0.002);
  }
  const SILL = ["Pothos", "Fern", "Books", "SnakePlant", "Fern", "Pothos", "Books", "Fern", "SnakePlant", "Pothos"];
  const CORNER = ["SnakePlant", "Fern", null, "SnakePlant", null, "Fern", null, "SnakePlant", null];

  // Stops: one bay per exhibit and one for the Information desk, plus a bay at each end so the hall
  // doesn't stop at the frame.
  const stops = exhibits.length;
  const deskIndex = exhibits.findIndex((exhibit) => exhibit.kind === "desk");
  for (let i = -1; i <= stops; i++) {
    const x = i * BAY_WIDTH;
    const bay = bayTemplate.clone(true);
    bay.position.x = x;
    scene.add(bay);
    const sill = SILL[(i + 1) % SILL.length];
    // The desk bay's sill stays bare: the fatherhood plinth stands under that window.
    if (i !== deskIndex) dress(sill, x + WINDOW.x, WINDOW.sill, WALL_Z - 0.05, sill === "Books" ? 0.9 : 1, i + 2, 0.32);
    const corner = i < stops ? CORNER[(i + 1) % CORNER.length] : null;
    if (corner) dress(corner, x + BAY_WIDTH / 2, 0, -0.78, corner === "Fern" ? 1.45 : 1.7, i + 7, 0.3);
    // The sconce's painted wall glow costs nothing, so every bay keeps its own.
    const spill = new THREE.Mesh(spillGeometry, spillMaterial);
    spill.position.set(x + SCONCE.x, SCONCE.y + 0.03, WALL_Z + 0.004);
    spill.renderOrder = 1;
    scene.add(spill);
  }

  // Each case is set a little differently inside: its own deck cloth, and its own mount instead of
  // the oak riser where the specimen brings one. Hover lifts only the specimen that rests on a riser.
  // `scale` enlarges a specimen about the middle of the deck: display models, sized to hold the case.
  // `wide` puts the specimen in the wider case (006's still life).
  type Staging = { deck: string; riser: boolean; lift: boolean; scale: number; wide?: boolean };
  const STAGING: Record<string, Staging> = {
    Skull: { deck: "#d8caae", riser: true, lift: true, scale: 1 }, // linen
    Samples: { deck: "#c6cdc3", riser: false, lift: false, scale: 1.4 }, // pale lab green
    KDS: { deck: "#5c6668", riser: false, lift: false, scale: 1.12 }, // slate felt
    Laptop: { deck: "#e4dac5", riser: false, lift: false, scale: 1.2 }, // cream
    Planning: { deck: "#8796a0", riser: false, lift: false, scale: 1.25 }, // dusty blue, so the cork stands out
    AfterHours: { deck: "#a89a86", riser: false, lift: false, scale: 1.1, wide: true }, // warm taupe: the iron and the camera read
  };
  const stagingFor = (exhibit: SceneExhibit) => STAGING[exhibit.specimen ?? ""] ?? STAGING.Skull;
  const cabinetFor = (exhibit: SceneExhibit) => (stagingFor(exhibit).wide ? WIDE_CABINET : CABINET);

  const dustTexture = radialTexture("rgba(255,236,205,1)", "rgba(255,236,205,0)");
  owned.push(dustTexture);
  const dust: { points: THREE.Points; seeds: Float32Array; origin: THREE.Vector3 }[] = [];
  const specimens: (THREE.Object3D | null)[] = [];
  const captions: (THREE.Vector3 | null)[] = [];
  type Drawer = { node: THREE.Object3D | null; baseZ: number; note: THREE.Object3D | null; noteBase: number };
  const drawers: Drawer[] = [];

  exhibits.forEach((exhibit, i) => {
    const x = i * BAY_WIDTH;
    if (exhibit.kind === "desk") {
      // The Information desk stands where a cabinet would.
      const desk = deskTemplate?.clone(true);
      if (desk) {
        desk.position.x += x;
        scene.add(desk);
      }
      contact(x, CASE_Z, 1.15, 0.002, 0.72);
      specimens.push(null);
      captions.push(null);
      drawers.push({ node: null, baseZ: 0, note: null, noteBase: 0 });
      return;
    }
    const staging = stagingFor(exhibit);
    const cabinet = cabinetFor(exhibit);
    const display = (staging.wide ? wideTemplate : caseTemplate).clone(true);
    display.position.x = x;
    scene.add(display);
    contact(x + (cabinet.x0 + cabinet.x1) / 2, CASE_Z, cabinet.x1 - cabinet.x0 + 0.2, 0.002, 0.74);
    const deck = part(display, "Deck") as THREE.Mesh | undefined;
    if (deck) {
      const cloth = (deck.material as THREE.MeshStandardMaterial).clone();
      cloth.color.set(staging.deck);
      deck.material = cloth;
      owned.push(cloth);
    }
    const riser = part(display, "Riser");
    // The visual benchmark (case 1 only, until the treatment is approved for the whole museum): its
    // cabinet, drawer and riser take a local satin-oak variant; every other case keeps the shared oak.
    if (i === 0) {
      const variants = new Map<THREE.Material, THREE.MeshStandardMaterial>();
      display.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return;
        const shared = node.material as THREE.MeshStandardMaterial;
        if (!shared.name.startsWith("OakGrain") || !shared.map) return;
        let variant = variants.get(shared);
        if (!variant) {
          variant = shared.clone();
          variant.color.set("#ad937c"); // A touch less orange under the warm key.
          variant.roughness = 1;
          variant.roughnessMap = shared.map;
          variant.envMap = environment;
          variant.envMapIntensity = ENV_INTENSITY * 0.9; // Enough room light for an edge to read as waxed.
          variant.onBeforeCompile = satinOak;
          variants.set(shared, variant);
          owned.push(variant);
        }
        node.material = variant;
      });
    }
    if (riser) riser.visible = staging.riser;
    const drawer = part(display, "Drawer") ?? null;
    const note = drawer ? (part(drawer, "DrawerNote") ?? null) : null;
    drawers.push({ node: drawer, baseZ: drawer?.position.z ?? 0, note, noteBase: note?.rotation.x ?? 0 });
    // The curator's things live in the first gallery only.
    if (i === 0 && propsTemplate) {
      const props = propsTemplate.clone(true);
      props.position.x += x;
      scene.add(props);
    }
    if (staging.riser) {
      // Contact where the riser meets the deck: small, soft, inside the case.
      const riserContact = new THREE.Mesh(contactGeometry, deckContactMaterial);
      riserContact.position.set(x, DECK_Y + 0.0008, CASE_Z - 0.005);
      riserContact.scale.set(0.27, 1, 0.24);
      scene.add(riserContact);
    }

    const template = exhibit.specimen ? source.getObjectByName(exhibit.specimen) : undefined;
    const specimen = exhibit.status === "on-view" && template ? template.clone(true) : null;
    if (specimen) {
      // Scale about the deck's centre (c): the node's own position P becomes c(1 - k) + kP.
      const k = staging.scale;
      specimen.scale.multiplyScalar(k);
      specimen.position.set(k * specimen.position.x + x, DECK_Y * (1 - k) + k * specimen.position.y, CASE_Z * (1 - k) + k * specimen.position.z);
      specimen.userData.baseY = specimen.position.y;
      specimen.userData.baseRotation = specimen.rotation.clone();
      specimen.userData.lift = staging.lift;
      if (exhibit.specimen === "Skull") {
        // The cast still throws its shadow on the riser and deck, but doesn't receive its own: variance
        // shadows self-shadowing a smooth dome leave a grey band at the terminator (the rough band on
        // the forehead and temples). Its hollows keep their depth from the baked occlusion.
        specimen.traverse((node) => {
          if (node instanceof THREE.Mesh) node.receiveShadow = false;
        });
      }
      scene.add(specimen);
      if (staging.riser) {
        // Where the specimen rests on the riser. It fades a little as the specimen lifts on hover.
        const seat = new THREE.Mesh(contactGeometry, seatMaterial.clone());
        seat.position.set(x, DECK_Y + 0.035 + 0.0008, CASE_Z - 0.012);
        seat.scale.set(0.13, 1, 0.16);
        seat.rotation.y = specimen.rotation.y;
        scene.add(seat);
        owned.push(seat.material as THREE.Material);
        specimen.userData.seat = seat;
      }
    }
    specimens.push(specimen);
    // A caption pinned to the specimen (006's plaque, 003's bump bar), fixed in the world once placed.
    const markers: THREE.Object3D[] = [];
    specimen?.traverse((node) => {
      if (node.name.startsWith("CaptionAnchor")) markers.push(node);
    });
    specimen?.updateMatrixWorld(true);
    captions.push(markers[0] ? markers[0].getWorldPosition(new THREE.Vector3()) : null);

    // Sparse dust drifting in the exhibit's beam: a few dozen motes, visible only where the light catches them.
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
    dust.push({ points, seeds, origin: new THREE.Vector3(x + 0.22, 1.11, CASE_Z + 0.35) });
  });

  // ---------------------------------------------------------------- the fatherhood plinth
  //
  // A small empty plinth under the desk bay's window, between case 006 and the desk: not a stop. Its
  // warm pool of light is painted, not lit (no light added to the pool, so no shader recompiles): a
  // glow on the floor, a softer one on the wainscot behind it, and a little on its linen top.
  const plinthX = deskIndex >= 0 ? deskIndex * BAY_WIDTH + PLINTH.x : null;
  if (plinthX !== null && plinthTemplate) {
    const plinth = plinthTemplate.clone(true);
    plinth.position.set(plinthX, 0, PLINTH.z);
    plinth.rotation.y = THREE.MathUtils.degToRad(-2); // Set down by hand.
    scene.add(plinth);
    contact(plinthX, PLINTH.z, 0.56, 0.003);
    const poolTexture = radialTexture("rgba(255,196,128,1)", "rgba(255,170,96,0)");
    const pool = (opacity: number) => new THREE.MeshBasicMaterial({ map: poolTexture, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const floorPool = pool(0.32);
    const wallPool = pool(0.2);
    const topPool = pool(0.2);
    owned.push(poolTexture, floorPool, wallPool, topPool);
    const glowAt = (material: THREE.Material, x: number, y: number, z: number, w: number, h: number, flat: boolean) => {
      const glow = new THREE.Mesh(flat ? contactGeometry : new THREE.PlaneGeometry(1, 1), material);
      if (!flat) owned.push(glow.geometry);
      glow.position.set(x, y, z);
      glow.scale.set(w, flat ? 1 : h, flat ? h : 1);
      glow.renderOrder = 1;
      scene.add(glow);
    };
    glowAt(floorPool, plinthX, 0.004, PLINTH.z + 0.12, 1.1, 0.8, true);
    glowAt(wallPool, plinthX, 0.98, WALL_Z + 0.045, 0.8, 1.5, false);
    glowAt(topPool, plinthX, PLINTH.recess + 0.0015, PLINTH.z, 0.3, 0.3, true); // Pooled in the ivory recess.
  }

  // ---------------------------------------------------------------- the light pool
  //
  // Lights cost every pixel, so the hall doesn't get a set per bay. Four sets follow the camera, one per
  // bay from the one behind it to two ahead: a cool window light, the warm sconce, the exhibit's key
  // spot and a small warm fill (the bounce under a specimen, or the desk's banker's lamp). The count
  // never changes, so no shader recompiles as you walk. Only the three nearest cases cast shadows.
  type LightSet = { bay: number; window: THREE.RectAreaLight; sconce: THREE.PointLight; key: THREE.SpotLight; fill: THREE.PointLight };
  const pool: LightSet[] = [0, 1, 2, 3].map((slot) => {
    const window = new THREE.RectAreaLight("#9db7dd", 2.3, WINDOW.width, WINDOW.top - WINDOW.sill); // Deep blue evening.
    const sconce = new THREE.PointLight("#ffc184", 0.4, 2.2, 2);
    // The exhibit light: broad, warm, from high above and a little to the right, so it models the
    // specimen and drops its shadows short and soft instead of raking them up the wall.
    const key = new THREE.SpotLight(AMBER, KEY_INTENSITY, 0, THREE.MathUtils.degToRad(25), 0.9, 2);
    key.castShadow = slot >= 1; // Exactly three at a time; which three follows the walk.
    key.shadow.mapSize.set(2048, 2048); // Fine enough for the skull's shadow at gallery distance.
    key.shadow.camera.near = 1.2; // A tight depth range keeps the shadow precise.
    key.shadow.camera.far = 3.8;
    key.shadow.bias = -0.0002;
    key.shadow.normalBias = 0.006; // Small, so shadows stay attached where things touch.
    key.shadow.radius = 10;
    key.shadow.blurSamples = 16;
    const fill = new THREE.PointLight("#ffd3a0", 0.03, 0.5, 2);
    scene.add(window, sconce, key, key.target, fill);
    return { bay: Number.NaN, window, sconce, key, fill };
  });
  const keys = pool.map(({ key }) => key);
  /** How much of a pooled set's light a bay gets, by its distance from the camera's position along the
   *  hall (rel, in bays). Zero at the pool's edges, so a set joins and leaves the pool unseen. */
  function presence(rel: number) {
    if (rel < -1) return THREE.MathUtils.smoothstep(rel, -1.5, -1);
    if (rel > 2) return 1 - THREE.MathUtils.smoothstep(rel, 2, 2.5);
    return 1;
  }
  /** Moves the pool so its sets light bays base - 1 to base + 2. */
  function assignLights(base: number) {
    let moved = false;
    pool.forEach((set, slot) => {
      const bay = base - 1 + slot;
      if (set.bay === bay) return;
      set.bay = bay;
      moved = true;
      const x = bay * BAY_WIDTH;
      set.window.position.set(x + WINDOW.x, (WINDOW.sill + WINDOW.top) / 2, WALL_Z + 0.04);
      set.window.lookAt(x + WINDOW.x + 0.5, 0.2, 1.6);
      set.sconce.position.set(x + SCONCE.x, SCONCE.y, SCONCE.z + 0.05);
      set.key.position.set(x + 0.32, 3.1, CASE_Z + 0.62);
      set.key.target.position.set(x, DECK_Y + 0.08, CASE_Z);
      set.key.target.updateMatrixWorld();
      // The benchmark bay's key is a tighter pool, falling off toward the cabinet's front as in the reference.
      set.key.angle = THREE.MathUtils.degToRad(bay === 0 ? 20 : 25);
      const isStop = bay >= 0 && bay < stops;
      set.key.visible = true; // Kept in the count either way; dark bays just get no key.
      set.key.userData.on = isStop;
      if (bay === deskIndex) {
        set.fill.position.set(x + 0.02, 1.08, CASE_Z + 0.08); // Under the banker's lamp.
        set.fill.color.set("#ffc98a");
        set.fill.userData.full = 0.35;
        set.fill.distance = 1.6;
      } else {
        set.fill.position.set(x - 0.04, DECK_Y + 0.07, CASE_Z + 0.16); // Bounced up from the deck.
        set.fill.color.set("#ffd3a0");
        // The benchmark bay (case 1) gets a stronger bounce: the linen deck's warm light lifting the
        // underside of the cranium, the sockets and the shadowed cheek, as it does in the reference.
        set.fill.userData.full = bay === 0 ? 0.06 : isStop ? 0.03 : 0;
        set.fill.distance = 0.5;
      }
    });
    if (moved) renderer.shadowMap.needsUpdate = true;
  }
  /** Fades each set by its bay's distance, and gives shadows to the two cases the camera is between plus
   *  the one peeking in at the right, so no visible case gains or loses its shadow as you walk. */
  function lightPool(position: number) {
    const near = Math.floor(position + 0.0001);
    let shadowsMoved = false;
    for (const set of pool) {
      const w = presence(set.bay - position);
      set.window.intensity = 2.3 * w;
      set.sconce.intensity = 0.4 * w;
      set.fill.intensity = (set.fill.userData.full as number) * w;
      const on = set.key.userData.on as boolean;
      const g = on ? glow[set.bay] : 0;
      set.key.intensity = on ? KEY_INTENSITY * (1 + 0.32 * g) * w : 0;
      set.key.color.copy(AMBER).lerp(AMBER_HOVER, g * 0.6);
      const shadowed = set.bay >= near && set.bay <= near + 2;
      if (set.key.castShadow !== shadowed) {
        set.key.castShadow = shadowed;
        shadowsMoved = true;
      }
    }
    if (shadowsMoved) renderer.shadowMap.needsUpdate = true;
  }

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

  // Hit boxes for hover: the glass case and its cabinet, and each drawer front (which moves with it).
  const boxes = exhibits.map((exhibit, i) => {
    const x = i * BAY_WIDTH;
    if (exhibit.kind === "desk") return new THREE.Box3(new THREE.Vector3(x - 0.48, 0, CASE_Z - 0.27), new THREE.Vector3(x + 0.48, 1.15, CASE_Z + 0.27));
    const cabinet = cabinetFor(exhibit);
    return new THREE.Box3(new THREE.Vector3(x + cabinet.x0, 0, CASE_Z - 0.27), new THREE.Vector3(x + cabinet.x1, DECK_Y + 0.36, CASE_Z + 0.29));
  });
  const drawerBox = new THREE.Box3();

  // ---------------------------------------------------------------- camera rig

  let reduced = options.reducedMotion;
  let visible = true;
  let target = 0;
  let current = 0;
  let velocity = 0; // Cases per second.
  const SPRING = 20; // The camera spring's natural frequency, per second.
  let time = 0;
  let highlightIndex: number | null = null;
  const glow = exhibits.map(() => 0); // 0 to 1 per case, eased toward the highlight.
  // Each drawer runs on a critically damped spring, so it eases out and in, never overshoots, and
  // can be reversed mid-slide without a jolt.
  const drawerGoal = exhibits.map(() => 0);
  const drawerOpen = exhibits.map(() => 0);
  const drawerSpeed = exhibits.map(() => 0);
  const nod = exhibits.map(() => -1); // Seconds since the specimen's reaction began; -1 when at rest.
  let width = 1;
  let height = 1;
  const framing = { distance: 3.5, camX: 0, lookX: 0, lookY: SPECIMEN_Y, height: 1.4 };

  function frame() {
    const aspect = width / height;
    camera.aspect = aspect;
    camera.fov = aspect < 0.8 ? 40 : 31;
    camera.updateProjectionMatrix();
    const halfV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const halfH = halfV * aspect;
    if (aspect >= 0.8) {
      // Back far enough for the floor and the rug, and turned a little down the hall, so the cabinet,
      // its shelf and label make one vignette left of center and the next case peeks in at the right.
      // A step closer than the room-wide view: the case fills more of the frame, and the next case is
      // a sliver at the right edge.
      framing.distance = Math.max(3.15, 1.3 / halfH);
      const wide = THREE.MathUtils.clamp((aspect - 1.2) / 0.4, 0, 1); // 0 on squarer screens, 1 from 16:10.
      framing.camX = -0.08;
      framing.lookX = 0.2 + 0.46 * wide;
      framing.lookY = 0.8;
      framing.height = 1.48;
    } else {
      // Phones: the case in the upper half, the label below it.
      framing.distance = Math.max(2.75, 0.55 / halfH);
      framing.camX = framing.lookX = (CABINET.x0 + CABINET.x1) / 2;
      framing.lookY = SPECIMEN_Y - 0.34 * framing.distance * halfV;
      framing.height = framing.lookY + 0.3;
    }
  }

  const lookAt = new THREE.Vector3();
  function place() {
    const x = current * BAY_WIDTH;
    // A touch of lead in the direction of travel, no zoom and no roll: the eye arrives slightly first.
    const lead = THREE.MathUtils.clamp(velocity * BAY_WIDTH * 0.03, -0.18, 0.18);
    camera.position.set(x + framing.camX, framing.height, CASE_Z + framing.distance);
    lookAt.set(x + framing.lookX + lead, framing.lookY, CASE_Z);
    camera.lookAt(lookAt);
  }

  const anchorPoint = new THREE.Vector3();
  const toCamera = new THREE.Vector3();
  function toScreen(point: THREE.Vector3) {
    point.project(camera);
    return { x: (point.x * 0.5 + 0.5) * width, y: (-point.y * 0.5 + 0.5) * height, ndc: point.x };
  }
  function anchors(): LabelAnchor[] {
    const portrait = width / height < 0.8;
    return exhibits.map((exhibit, i) => {
      const x = i * BAY_WIDTH;
      // Wide screens: pinned to the wall above the shelf (beside the desk at the end). Phones: under the
      // case, clear of the drawer.
      const desk = exhibit.kind === "desk";
      const label = portrait
        ? toScreen(anchorPoint.set(x + framing.lookX, desk ? 0.62 : 0.5, CASE_Z + 0.3))
        : toScreen(anchorPoint.set(x + (desk ? 0.55 : stagingFor(exhibit).wide ? 0.36 : 0.27), desk ? 1.22 : 1.2, CASE_Z));
      const front = toScreen(anchorPoint.set(x + DRAWER.x1, (DRAWER.y0 + DRAWER.y1) / 2, DRAWER.front + DRAWER.travel * drawerOpen[i]));
      const at = captions[i];
      let caption: LabelAnchor["caption"] = null;
      if (at) {
        const inFront = toCamera.copy(at).applyMatrix4(camera.matrixWorldInverse).z < 0;
        const point = toScreen(anchorPoint.copy(at));
        caption = { x: point.x, y: point.y, visible: inFront && Math.abs(point.ndc) < 1.05 };
      }
      return { x: label.x, y: label.y, visible: label.ndc > -1.6 && label.ndc < 1.6, drawer: { x: front.x, y: front.y }, caption };
    });
  }

  const hidden: PlinthAnchor = { x: 0, y: 0, opacity: 0 };
  /** The plinth card sits on the plinth's front face, below its top; it fades out toward the frame's edges. */
  function plinthAnchor(): PlinthAnchor {
    if (plinthX === null) return hidden;
    anchorPoint.set(plinthX, PLINTH.top - 0.15, PLINTH.z + PLINTH.front + 0.02);
    const behind = anchorPoint.clone().applyMatrix4(camera.matrixWorldInverse).z > 0;
    const point = toScreen(anchorPoint);
    if (behind) return hidden;
    const edge = Math.abs(point.ndc);
    return { x: point.x, y: point.y, opacity: THREE.MathUtils.clamp((0.92 - edge) / 0.22, 0, 1) };
  }

  /** Advances everything by dt seconds. Returns true while the camera or a highlight is still moving. */
  function update(dt: number) {
    let moving = false;
    if (reduced) {
      current = target;
      velocity = 0;
    } else {
      // A critically damped spring on the scroll position, solved exactly, so it's the same at 30, 60 or
      // 120 frames per second. Speed carries across input events instead of restarting from rest with each
      // one, it never overshoots, and it's stiff: about 0.1 s behind steady scrolling, settled 0.3 s after
      // you stop. The scroll position itself is already smooth (the browser's, or the hall's own glide).
      const error = current - target;
      const decay = Math.exp(-SPRING * dt);
      const k = velocity + SPRING * error;
      current = target + (error + k * dt) * decay;
      velocity = (velocity - SPRING * k * dt) * decay;
      if (Math.abs(target - current) < 0.0003 && Math.abs(velocity) < 0.003) {
        current = target;
        velocity = 0;
      }
    }
    if (current !== target) moving = true;

    let lifting = false;
    // The light pool follows the camera: sets for the bay behind it to two bays ahead. It re-centres at
    // the midpoint of a walk, where the bays it hands over are out of frame either way.
    assignLights(Math.round(current));
    lightPool(current);
    glow.forEach((value, i) => {
      const goal = highlightIndex === i ? 1 : 0;
      const next = reduced ? goal : value + (goal - value) * (1 - Math.exp(-7 * dt));
      glow[i] = Math.abs(goal - next) < 0.002 ? goal : next;
      if (glow[i] !== goal) moving = true;
      const specimen = specimens[i];
      if (glow[i] !== goal && specimen?.userData.lift) lifting = true;
      if (specimen) {
        specimen.position.y = specimen.userData.baseY + (reduced || !specimen.userData.lift ? 0 : LIFT * glow[i]);
        const seat = specimen.userData.seat as THREE.Mesh | undefined;
        if (seat) (seat.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - (reduced ? 0 : glow[i]) * 0.5);
      }
    });
    // Drawers: a spring toward open or shut, stepped finely so it stays stable at any frame rate.
    drawerOpen.forEach((value, i) => {
      const goal = drawerGoal[i];
      if (value === goal && drawerSpeed[i] === 0) return;
      if (reduced) {
        drawerOpen[i] = goal;
        drawerSpeed[i] = 0;
      } else {
        const stiffness = 8;
        for (let left = dt; left > 0; left -= 1 / 240) {
          const step = Math.min(left, 1 / 240);
          drawerSpeed[i] += (stiffness * stiffness * (goal - drawerOpen[i]) - 2 * stiffness * drawerSpeed[i]) * step;
          drawerOpen[i] += drawerSpeed[i] * step;
        }
        if (Math.abs(goal - drawerOpen[i]) < 0.0005 && Math.abs(drawerSpeed[i]) < 0.01) {
          drawerOpen[i] = goal;
          drawerSpeed[i] = 0;
        }
      }
      moving = lifting = true;
      const { node, baseZ, note, noteBase } = drawers[i];
      if (node) node.position.z = baseZ + DRAWER.travel * drawerOpen[i];
      // The folded note stands up on its hinge once the drawer is mostly out, like a pop-up card.
      const stand = THREE.MathUtils.smoothstep(drawerOpen[i], 0.45, 1);
      if (note) note.rotation.x = noteBase + stand * 1.25;
    });

    // The specimen's one reaction when its drawer is opened: it leans in to look, then settles back.
    nod.forEach((elapsed, i) => {
      if (elapsed < 0) return;
      const specimen = specimens[i];
      const t = elapsed + dt;
      const settled = t > 2.4 || reduced;
      nod[i] = settled ? -1 : t;
      const envelope = settled ? 0 : (t / 0.38) * Math.exp(1 - t / 0.38); // Rises to 1 at 0.38 s, gone by about 2 s.
      if (specimen) {
        specimen.rotation.x = specimen.userData.baseRotation.x + 0.075 * envelope;
        specimen.rotation.z = specimen.userData.baseRotation.z - 0.045 * envelope;
        specimen.position.y += 0.006 * envelope; // Rock on the front edge instead of sinking into the riser.
      }
      moving = lifting = true;
    });

    if (lifting && !reduced) renderer.shadowMap.needsUpdate = true; // Shadows follow the specimen and the drawer.

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
    options.onFrame?.(anchors(), current, plinthAnchor());
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
  options.onFrame?.(anchors(), current, plinthAnchor());
  kick();

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const hit = new THREE.Vector3();
  function aim(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
  }

  const api: MuseumScene = {
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
      aim(clientX, clientY);
      const index = boxes.findIndex((box) => raycaster.ray.intersectBox(box, hit));
      return index === -1 ? null : index;
    },
    pickDrawer(clientX, clientY) {
      aim(clientX, clientY);
      const index = exhibits.findIndex((_, i) => {
        const x = i * BAY_WIDTH;
        const z = DRAWER.front + DRAWER.travel * drawerOpen[i];
        drawerBox.min.set(x + DRAWER.x0, DRAWER.y0, z - 0.05);
        drawerBox.max.set(x + DRAWER.x1, DRAWER.y1, z + 0.02);
        return raycaster.ray.intersectBox(drawerBox, hit) !== null;
      });
      return index === -1 ? null : index;
    },
    setDrawer(index, open) {
      if (index < 0 || index >= exhibits.length) return;
      const goal = open ? 1 : 0;
      if (drawerGoal[index] === goal) return;
      drawerGoal[index] = goal;
      if (open && !reduced && specimens[index]?.userData.lift) nod[index] = 0; // Only the skull leans in to look.
      kick();
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
      keys.forEach((key) => key.shadow.dispose()); // renderer.dispose() leaves shadow render targets alive.
      environment.dispose();
      pmrem.dispose();
      // No forceContextLoss here: in development React mounts twice and the next scene reuses this canvas's context.
      // Side effect, development only: the two renderers' cached GL state collides, which can leave a stale shadow
      // map (a skull-shaped shadow on case 2's empty riser). Production mounts once and renders clean.
      renderer.dispose();
    },
  };
  if (options.frameLog) Object.assign(window, { __museumApi: api }); // Debug only (?debug): lets tests park the camera.
  return api;
}
