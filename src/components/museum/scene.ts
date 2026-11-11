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
const SCONCE = { x: 0.98, y: 1.63, z: -0.885 };

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
type Tone = { color: string; roughness?: number; metalness?: number; env?: number; grainRoughness?: boolean };
const TONES: Record<string, Tone> = {
  PaintTeal: { color: "#86a097", roughness: 1, env: 0.5 },
  PaintCream: { color: "#e2d2b6", roughness: 1, env: 0.5 },
  // Waxed oak. Roughness comes from the grain texture, which samples at about 0.37 to 0.43 in linear
  // color, so the factor sits well above 1: the result lands at about 0.9 to 1, matte, grain-led.
  OakGrain: { color: "#b3967a", roughness: 2.4, grainRoughness: true, env: 0.55 },
  Oak: { color: "#b3967a", roughness: 2.4, grainRoughness: true, env: 0.55 },
  FloorOak: { color: "#968069", roughness: 2.4, grainRoughness: true, env: 0.55 },
  Bronze: { color: "#b09257", roughness: 0.36, metalness: 1, env: 1.6 }, // Brass: yellower than copper, softly polished.
  Linen: { color: "#d8caae", roughness: 1, env: 0.5 },
  SkullPlaster: { color: "#ece5d7", roughness: 0.92, env: 0.5 },
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
  scene.environmentIntensity = ENV_INTENSITY; // The base level; each tone scales it below.
  // A material that borrows scene.environment always gets scene.environmentIntensity (three overrides
  // envMapIntensity), so toned materials take the map directly to keep their own reflection strength.
  const reflect = (material: THREE.MeshStandardMaterial, strength: number) => {
    material.envMap = environment;
    material.envMapIntensity = ENV_INTENSITY * strength;
  };
  // Blue-green room light from above, a warmer bounce from the floor. Lower than before, for depth.
  scene.add(new THREE.HemisphereLight("#9db9b7", "#5c4a39", 0.46));

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
      // Parchment lit from inside. It's a light source, so it skips tone mapping: AgX desaturates bright
      // orange toward tan, and a glowing shade should land exactly as warm as chosen here.
      const shade = new THREE.MeshBasicMaterial({ color: "#f6cf98", toneMapped: false, fog: false, side: THREE.DoubleSide });
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
    const tone = TONES[material.name.split(".")[0]];
    if (tone) {
      material.color.set(tone.color);
      if (tone.roughness !== undefined) material.roughness = tone.roughness;
      if (tone.metalness !== undefined) material.metalness = tone.metalness;
      if (tone.env !== undefined) reflect(material, tone.env);
      // The grain texture doubles as a roughness map: denser grain reads a touch rougher than the flats.
      if (tone.grainRoughness && material.map) material.roughnessMap = material.map;
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
  function contact(x: number, z: number, size: number, y = 0.002) {
    const shadow = new THREE.Mesh(contactGeometry, contactMaterial);
    shadow.position.set(x, y, z);
    shadow.scale.set(size, 1, size);
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
    const windowLight = new THREE.RectAreaLight("#a3c5d2", 2.3, WINDOW.width, WINDOW.top - WINDOW.sill);
    windowLight.position.set(x + WINDOW.x, (WINDOW.sill + WINDOW.top) / 2, WALL_Z + 0.04);
    windowLight.lookAt(x + WINDOW.x + 0.5, 0.2, 1.6);
    scene.add(windowLight);

    // The sconce: light escapes the shade's open top and bottom, so the wall gets an upward and a
    // downward scallop (a painted light decal, nearly free), and a small real light warms the label area.
    const sconce = new THREE.PointLight("#ffc184", 0.4, 2.2, 2);
    sconce.position.set(x + SCONCE.x, SCONCE.y, SCONCE.z + 0.05);
    scene.add(sconce);
    const spill = new THREE.Mesh(spillGeometry, spillMaterial);
    spill.position.set(x + SCONCE.x, SCONCE.y + 0.03, WALL_Z + 0.004);
    spill.renderOrder = 1;
    scene.add(spill);
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
    // Contact where the riser meets the linen deck: small, soft, inside the case.
    const riserContact = new THREE.Mesh(contactGeometry, deckContactMaterial);
    riserContact.position.set(x, DECK_Y + 0.0008, CASE_Z - 0.005);
    riserContact.scale.set(0.27, 1, 0.24);
    scene.add(riserContact);

    const template = exhibit.specimen ? source.getObjectByName(exhibit.specimen) : undefined;
    const specimen = exhibit.status === "on-view" && template ? template.clone(true) : null;
    if (specimen) {
      specimen.position.x += x;
      specimen.userData.baseY = specimen.position.y;
      scene.add(specimen);
      // And where the skull rests on the riser. It fades a little as the skull lifts on hover.
      const seat = new THREE.Mesh(contactGeometry, seatMaterial.clone());
      seat.position.set(x, DECK_Y + 0.035 + 0.0008, CASE_Z - 0.012);
      seat.scale.set(0.13, 1, 0.16);
      seat.rotation.y = specimen.rotation.y;
      scene.add(seat);
      owned.push(seat.material as THREE.Material);
      specimen.userData.seat = seat;
    }
    specimens.push(specimen);

    // The exhibit light: broad, warm, from high above and a little to the right, so it models the
    // skull's form and drops its shadows short and soft instead of raking them up the wall.
    const key = new THREE.SpotLight(AMBER, KEY_INTENSITY, 0, THREE.MathUtils.degToRad(25), 0.9, 2);
    key.position.set(x + 0.32, 3.1, CASE_Z + 0.62);
    key.target.position.set(x, DECK_Y + 0.08, CASE_Z);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); // Fine enough for the skull's shadow at gallery distance.
    key.shadow.camera.near = 1.2; // A tight depth range keeps the shadow precise.
    key.shadow.camera.far = 3.8;
    key.shadow.bias = -0.0002;
    key.shadow.normalBias = 0.006; // Small, so shadows stay attached where things touch.
    key.shadow.radius = 10;
    key.shadow.blurSamples = 16;
    scene.add(key, key.target);
    keys.push(key);

    // Warm light bounced up from the linen deck, so the underside of the jaw isn't a dead shadow.
    const bounce = new THREE.PointLight("#ffd3a0", 0.03, 0.5, 2);
    bounce.position.set(x - 0.04, DECK_Y + 0.07, CASE_Z + 0.16);
    scene.add(bounce);

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
      if (specimen) {
        specimen.position.y = specimen.userData.baseY + (reduced ? 0 : LIFT * glow[i]);
        const seat = specimen.userData.seat as THREE.Mesh | undefined;
        if (seat) (seat.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - (reduced ? 0 : glow[i]) * 0.5);
      }
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
      keys.forEach((key) => key.shadow.dispose()); // renderer.dispose() leaves shadow render targets alive.
      environment.dispose();
      pmrem.dispose();
      // No forceContextLoss here: in development React mounts twice and the next scene reuses this canvas's context.
      // Side effect, development only: the two renderers' cached GL state collides, which can leave a stale shadow
      // map (a skull-shaped shadow on case 2's empty riser). Production mounts once and renders clean.
      renderer.dispose();
    },
  };
}
