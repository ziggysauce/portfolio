import * as THREE from "three";
import type { Discovery } from "@/content/exhibits";

// The drawer discoveries: one small set of props per cabinet drawer (built in blender/museum_exhibits.py,
// nodes "Discovery1" to "Discovery6"), parented into that case's drawer so they slide out with it.
//
// Each one has an automatic reveal, timed from the moment its drawer is asked to open, and some have
// steps the visitor takes (ring the bell, read the card, stamp a card). React owns the steps; this file
// only animates toward them. Everything sinks back as the drawer shuts and is reset only once it's shut,
// so nothing visibly snaps back.

/** How long a step's animation takes, so the page can hold further input until it's done. */
export const STEP_MS = { bell: 1800, stamp: 1150, card: 700, books: [1100, 900, 950, 2100, 2500] } as const;

export type DrawerDiscovery = {
  root: THREE.Object3D;
  /** Advances by dt. open is the drawer's openness (0 to 1), opening whether it's headed open. Returns
   *  true while something is still moving. */
  update(dt: number, open: number, opening: boolean, reduced: boolean): boolean;
  /** The visitor's progress through the discovery's steps (0 at rest). */
  setStep(step: number): void;
  /** Meshes a click on the canvas can act on (the bell, the stamp). */
  targets: THREE.Object3D[];
  dispose(): void;
};

const ease = (t: number) => {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};
/** Eases in quickly and settles slowly: for things that arrive. */
const settle = (t: number) => 1 - Math.pow(1 - THREE.MathUtils.clamp(t, 0, 1), 3);
const window01 = (t: number, start: number, length: number) => (t - start) / length;

/** How much larger than built each discovery is shown. */
const SCALE: Record<Discovery["kind"], number> = { tooth: 1.5, chart: 1.15, bell: 1.4, card: 1.3, stamp: 1.15, books: 1.2 };

/** How high a discovery's tray rises, in metres. */
const RISE = 0.11;

/** How far a hinged cover turns open, in radians (the sign opens it toward the visitor). */
const COVER_OPEN = -3.08;

const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "ui-monospace, 'SF Mono', Menlo, monospace";

/** A face drawn in code: crisp text and marks, lit like paper. */
function canvasFace(width: number, height: number, draw: (context: CanvasRenderingContext2D) => void, basic = false) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d")!;
  draw(context);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false; // glTF UVs run top-down, unlike a canvas texture's default.
  texture.anisotropy = 8;
  const material = basic
    ? new THREE.MeshBasicMaterial({ map: texture, color: "#d9d9d9", transparent: true, opacity: 0 })
    : new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, metalness: 0 });
  const redraw = (next: (context: CanvasRenderingContext2D) => void) => {
    context.clearRect(0, 0, width, height);
    next(context);
    texture.needsUpdate = true;
  };
  return { material, texture, redraw };
}

/** Wraps text into lines that fit maxWidth. */
function wrap(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (context.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function paper(context: CanvasRenderingContext2D, width: number, height: number, tint = "#f3ecdc") {
  context.fillStyle = tint;
  context.fillRect(0, 0, width, height);
}

/** The chart: a rising curve on plain axes. Illustrative only. */
function drawChart(context: CanvasRenderingContext2D, spec: Extract<Discovery, { kind: "chart" }>) {
  const W = 512;
  const H = 384;
  paper(context, W, H);
  context.fillStyle = "#2b2520";
  context.font = `italic 600 34px ${SERIF}`;
  context.textAlign = "center";
  context.fillText(spec.heading, W / 2, 52);
  const x0 = 92;
  const y0 = 300;
  const x1 = 470;
  const y1 = 86;
  context.strokeStyle = "#4a4038";
  context.lineWidth = 5;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(x0, y1);
  context.lineTo(x0, y0);
  context.lineTo(x1, y0);
  context.stroke();
  context.strokeStyle = "#b3542e";
  context.lineWidth = 9;
  context.beginPath();
  for (let i = 0; i <= 40; i++) {
    const u = i / 40;
    const x = x0 + 14 + u * (x1 - x0 - 30);
    const y = y0 - 14 - Math.pow(u, 2.2) * (y0 - y1 - 30);
    if (i === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.stroke();
  context.fillStyle = "#4a4038";
  context.font = `500 20px ${MONO}`;
  context.fillText(spec.xLabel, (x0 + x1) / 2, y0 + 34);
  context.save();
  context.translate(x0 - 30, (y0 + y1) / 2);
  context.rotate(-Math.PI / 2);
  context.fillText(spec.yLabel, 0, 0);
  context.restore();
  context.font = `italic 16px ${SERIF}`;
  context.fillStyle = "#6b6158";
  context.fillText(spec.footer, W / 2, H - 16);
}

function drawCover(context: CanvasRenderingContext2D, text: string) {
  const W = 512;
  const H = 360;
  paper(context, W, H, "#f6efe0");
  context.strokeStyle = "rgba(150,116,70,0.55)";
  context.lineWidth = 3;
  context.strokeRect(18, 18, W - 36, H - 36);
  context.fillStyle = "#2b2520";
  context.font = `italic 500 46px ${SERIF}`;
  context.textAlign = "center";
  const lines = wrap(context, text, W - 90);
  const top = H / 2 - ((lines.length - 1) * 54) / 2 + 14;
  lines.forEach((line, i) => context.fillText(line, W / 2, top + i * 54));
}

function drawInside(context: CanvasRenderingContext2D, paragraphs: string[]) {
  const W = 512;
  const H = 360;
  paper(context, W, H, "#f6efe0");
  context.fillStyle = "#27304a";
  context.font = `italic 24px ${SERIF}`;
  context.textAlign = "left";
  let y = 54;
  for (const paragraph of paragraphs) {
    for (const line of wrap(context, paragraph, W - 70)) {
      context.fillText(line, 35, y);
      y += 30;
    }
    y += 14;
  }
}

function drawTask(context: CanvasRenderingContext2D, text: string, stamped: boolean, seed: number) {
  const W = 384;
  const H = 256;
  paper(context, W, H, "#f7f1e3");
  context.strokeStyle = "rgba(120,140,170,0.35)";
  context.lineWidth = 2;
  for (let y = 92; y < H - 20; y += 34) {
    context.beginPath();
    context.moveTo(20, y);
    context.lineTo(W - 20, y);
    context.stroke();
  }
  context.strokeStyle = "rgba(179,84,46,0.5)";
  context.beginPath();
  context.moveTo(20, 60);
  context.lineTo(W - 20, 60);
  context.stroke();
  context.fillStyle = "#2b2520";
  context.font = `italic 600 40px ${SERIF}`;
  context.textAlign = "center";
  wrap(context, text, W - 48).forEach((line, i) => context.fillText(line, W / 2, 128 + i * 44));
  if (!stamped) return;
  // A slightly imperfect DONE: tilted, a little off-centre, with uneven ink.
  context.save();
  context.translate(W / 2 + 10 + (seed % 3) * 6, H / 2 + 14);
  context.rotate(-0.16 + (seed % 2) * 0.07);
  context.globalAlpha = 0.78;
  context.strokeStyle = "#a33a2b";
  context.lineWidth = 7;
  context.strokeRect(-104, -42, 208, 84);
  context.fillStyle = "#a33a2b";
  context.font = `800 58px ${MONO}`;
  context.textBaseline = "middle";
  context.fillText("DONE", 0, 3);
  context.globalCompositeOperation = "destination-out";
  for (let n = 0; n < 70; n++) {
    const a = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
    const r = a - Math.floor(a);
    const b = Math.sin(seed * 4.1 + n * 17.7) * 9631.7;
    const q = b - Math.floor(b);
    context.globalAlpha = 0.5;
    context.beginPath();
    context.arc(-104 + r * 208, -42 + q * 84, 1.5 + r * 2.5, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

/** A kitchen chit: warm white thermal paper, dark print, no names or numbers that could be real. */
function drawChit(context: CanvasRenderingContext2D, lines: string[]) {
  const W = 192;
  const H = 320;
  context.fillStyle = "#fbf6ea";
  context.fillRect(0, 0, W, H);
  context.fillStyle = "#24221f";
  context.textAlign = "center";
  context.font = `700 15px ${MONO}`;
  context.fillText("KITCHEN", W / 2, 30);
  context.fillRect(18, 44, W - 36, 2);
  context.textAlign = "left";
  context.font = `700 17px ${MONO}`;
  let y = 76;
  for (const line of lines) {
    for (const part of wrap(context, line, W - 28)) {
      context.fillText(part, 14, y);
      y += 24;
    }
  }
  context.setLineDash([6, 5]);
  context.lineWidth = 2;
  context.strokeStyle = "#24221f";
  context.beginPath();
  context.moveTo(14, y + 6);
  context.lineTo(W - 14, y + 6);
  context.stroke();
}

function drawTicket(context: CanvasRenderingContext2D, lines: string[], band: string) {
  const W = 224;
  const H = 220;
  context.fillStyle = "#e8e2d2";
  context.fillRect(0, 0, W, H);
  context.fillStyle = band;
  context.fillRect(0, 0, W, 30);
  context.fillStyle = "#2a2a28";
  context.font = `700 17px ${MONO}`;
  context.textAlign = "left";
  let y = 58;
  for (const line of lines) {
    for (const part of wrap(context, line, W - 24)) {
      context.fillText(part, 12, y);
      y += 24;
    }
  }
}

/** Builds the live discovery for a case from its template, inside its drawer. */
export function createDiscovery(options: {
  spec: Discovery;
  template: THREE.Object3D;
  drawer: THREE.Object3D;
  /** The drawer floor point it sits on, in world space with the drawer shut. */
  anchor: THREE.Vector3;
  /** The case's KDS screen display node, for 003's tickets. */
  specimen: THREE.Object3D | null;
  /** Whether the screen is portrait (a tighter spill). */
  compact?: () => boolean;
}): DrawerDiscovery {
  const { spec, drawer, anchor } = options;
  const root = options.template.clone(true);
  root.position.copy(anchor);
  // A little larger than built, so each reads at gallery distance; the lift below is in world terms.
  const scale = SCALE[spec.kind];
  root.scale.setScalar(scale);
  drawer.updateMatrixWorld(true);
  drawer.attach(root);
  root.visible = false;
  const owned: { dispose(): void }[] = [];
  // Shared part names get numbered on export ("DiscoveryLift", "DiscoveryLift001", ...): match either.
  const named = (holder: THREE.Object3D, name: string) => {
    const pattern = new RegExp(`^${name}\\d*$`);
    let found: THREE.Object3D | null = null;
    holder.traverse((n) => {
      if (!found && pattern.test(n.name)) found = n;
    });
    return found as THREE.Object3D | null;
  };
  const node = (name: string) => named(root, name);
  const base = new Map<THREE.Object3D, { position: THREE.Vector3; rotation: THREE.Euler }>();
  const remember = (object: THREE.Object3D | null) => {
    if (object) base.set(object, { position: object.position.clone(), rotation: object.rotation.clone() });
    return object;
  };
  const at = (object: THREE.Object3D | null) => (object ? base.get(object)! : null);
  /** Swaps a "Canvas*" face's material for one drawn in code. */
  const paint = (name: string, face: ReturnType<typeof canvasFace>, holder: THREE.Object3D = root) => {
    const mesh = (named(holder, name) as THREE.Mesh | null) ?? undefined;
    owned.push(face.material, face.texture);
    if (mesh) {
      mesh.material = face.material;
      mesh.castShadow = false;
    }
    return mesh ?? null;
  };

  let elapsed = 0; // Seconds since the drawer was asked to open.
  let step = 0;
  let shown = 0; // The step the props currently show.
  let stepTime = 99; // Seconds since the last step began.
  let wasShut = true;
  const targets: THREE.Object3D[] = [];

  // The shared lift: the tray and its props rise clear of the drawer front, the column stretching up
  // from the drawer floor beneath them. 006 rises in two stages: three books, a beat, then two more.
  const tray = remember(node("DiscoveryLift"));
  const column = node("DiscoveryColumn");
  const COLUMN = 0.008; // The column's resting height.
  const liftAt = (reduced: boolean) => {
    if (reduced) return RISE;
    return RISE * settle(window01(elapsed, 0.2, 0.75));
  };
  const placeLift = (reduced: boolean, sink: number) => {
    const height = (liftAt(reduced) * sink) / scale;
    if (tray) tray.position.y = at(tray)!.position.y + height;
    if (column) column.scale.y = 1 + height / COLUMN;
  };

  // Per-kind setup and pose. pose(reveal, sink) places everything; returns true while moving.
  let pose: (reduced: boolean, sink: number, dt: number) => boolean = () => false;
  let resetVisuals = () => {};
  /** Called when the visitor's step changes (only the reading list needs to plan its moves). */
  let onStep: (stage: number, reduced: boolean) => void = () => {};
  let reducedNow = false;

  switch (spec.kind) {
    case "tooth": {
      pose = (reduced) => !reduced && elapsed < 1.0;
      break;
    }
    case "chart": {
      const stand = remember(node("FolderStand"));
      const hinge = remember(node("FolderHinge"));
      paint("ChartPage", canvasFace(512, 384, (c) => drawChart(c, spec)));
      pose = (reduced, sink) => {
        // Up on the tray, the folder stands, then its cover opens on the chart.
        const s = reduced ? 1 : ease(window01(elapsed, 0.75, 0.6));
        const c = reduced ? 1 : ease(window01(elapsed, 1.3, 0.7));
        if (stand) stand.rotation.x = at(stand)!.rotation.x + 1.12 * s * sink;
        if (hinge) hinge.rotation.z = at(hinge)!.rotation.z + COVER_OPEN * c * sink;
        return !reduced && elapsed < 2.1;
      };
      break;
    }
    case "bell": {
      const plunger = remember(node("BellPlunger"));
      tray?.traverse((n) => n instanceof THREE.Mesh && n.name !== "DiscoveryTray" && targets.push(n));
      const screen = options.specimen;
      const tickets = spec.tickets.map((lines, n) => {
        const face = canvasFace(224, 220, (c) => drawTicket(c, lines, n === 0 ? "#79a08a" : "#c96f55"), true);
        const mesh = screen ? paint(`KdsTicket${n + 1}`, face, screen) : null;
        if (!mesh) owned.push(face.material, face.texture);
        if (mesh) {
          mesh.visible = false;
          remember(mesh);
        }
        return { mesh, material: face.material as THREE.MeshBasicMaterial };
      });
      // The kitchen printer: each accepted ring feeds one paper chit from the slot, its print emerging
      // with the paper. The first is cut (a small jolt), then settles into the tray; the second stays out.
      const slot = screen ? named(screen, "ChitSlot") : null;
      const restMark = screen ? named(screen, "ChitRestAnchor") : null;
      const LMAX = 0.07;
      const W = 0.044;
      const ROWS = 24;
      const restAt = new THREE.Vector3();
      if (slot && restMark) slot.worldToLocal(restMark.getWorldPosition(restAt));
      const REST_YAW = 0.32; // The cut chit lies on the deck turned a little, as if set down by hand.
      const chits = spec.tickets.map((lines, n) => {
        const face = canvasFace(192, 320, (c) => drawChit(c, lines));
        owned.push(face.material, face.texture);
        const material = face.material as THREE.MeshStandardMaterial;
        material.side = THREE.DoubleSide;
        material.color.set("#fbf6ea");
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(ROWS * 2 * 3);
        const uvs = new Float32Array(ROWS * 2 * 2);
        const index: number[] = [];
        for (let r = 0; r < ROWS; r++) {
          const v = r / (ROWS - 1); // 0 at the leading edge, which carries the top of the print.
          uvs.set([0, v, 1, v], r * 4);
          if (r < ROWS - 1) index.push(r * 2, r * 2 + 2, r * 2 + 1, r * 2 + 1, r * 2 + 2, r * 2 + 3);
        }
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
        geometry.setIndex(index);
        owned.push(geometry);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.visible = false;
        mesh.frustumCulled = false; // Its vertices move every frame; the bounds would go stale.
        slot?.add(mesh);
        return { mesh, positions, geometry, n };
      });
      const point = new THREE.Vector3();
      const flat = new THREE.Vector3();
      /** Shapes a chit: `fed` metres out of the slot along a gentle curl toward the visitor, `jolt` the
       *  cutter's nudge, `toTray` 0 to 1 from hanging at the slot to lying in the tray. */
      const shapeChit = (chit: (typeof chits)[number], fed: number, jolt: number, toTray: number) => {
        for (let r = 0; r < ROWS; r++) {
          const p = (r / (ROWS - 1)) * LMAX; // From the leading edge.
          const d = fed - p; // How far out of the slot this row is (negative: still inside the printer).
          if (d <= 0) point.set(0, d - 0.001, 0);
          else {
            const a = 0.12;
            const b = 9;
            point.set(0, (Math.sin(a + b * d) - Math.sin(a)) / b + jolt, (Math.cos(a) - Math.cos(a + b * d)) / b);
          }
          if (toTray > 0) {
            // On the deck beside the printer: lying toward the visitor, turned a little, its far end curling
            // up. On the way it arcs up and over, clear of the printer's casing.
            // Like a real receipt, its printed far end curls up off the deck, toward the visitor.
            const q = p / LMAX;
            const along = -LMAX / 2 + p;
            flat.set(restAt.x + Math.sin(REST_YAW) * along, restAt.y + 0.0012 + 0.024 * (1 - q) * (1 - q), restAt.z + Math.cos(REST_YAW) * along);
            point.lerp(flat, toTray);
            point.y += 0.05 * 4 * toTray * (1 - toTray);
          }
          // Across the paper: square to the slot while it hangs, turned with it once it lies on the deck.
          const ax = THREE.MathUtils.lerp(1, Math.cos(REST_YAW), toTray);
          const az = THREE.MathUtils.lerp(0, -Math.sin(REST_YAW), toTray);
          for (let side = 0; side < 2; side++) {
            const offset = (side - 0.5) * W;
            chit.positions.set([point.x + ax * offset, point.y, point.z + az * offset], (r * 2 + side) * 3);
          }
        }
        chit.geometry.attributes.position.needsUpdate = true;
        chit.geometry.computeVertexNormals();
      };
      resetVisuals = () => {
        tickets.forEach(({ mesh }) => mesh && (mesh.visible = false));
        chits.forEach(({ mesh }) => (mesh.visible = false));
      };
      pose = (reduced, sink) => {
        const press = reduced || shown === 0 ? 0 : Math.sin(Math.PI * THREE.MathUtils.clamp(stepTime / 0.32, 0, 1));
        if (plunger) plunger.position.y = at(plunger)!.position.y - 0.0035 * press;
        tickets.forEach(({ mesh, material }, n) => {
          if (!mesh) return;
          const arrived = n < shown - 1 || reduced ? 1 : n === shown - 1 ? settle(window01(stepTime, 0.12, 0.42)) : 0;
          mesh.visible = n < shown;
          material.opacity = arrived;
          mesh.position.y = at(mesh)!.position.y + 0.012 * (1 - arrived);
        });
        chits.forEach((chit, n) => {
          chit.mesh.visible = n < shown && !!slot;
          if (!chit.mesh.visible) return;
          const t = n < shown - 1 || reduced ? 9 : stepTime;
          if (n === 0) {
            const fed = LMAX * ease(window01(t, 0.15, 0.85));
            const cut = window01(t, 1.05, 0.14);
            const jolt = cut > 0 && cut < 1 ? 0.0018 * Math.sin(Math.PI * cut) : 0;
            const drop = settle(window01(t, 1.22, 0.5));
            shapeChit(chit, fed, jolt, drop); // Cut where it is, then laid in the tray.
          } else shapeChit(chit, LMAX * 0.72 * ease(window01(t, 0.15, 0.75)), 0, 0);
        });
        return !reduced && (elapsed < 1.0 || (shown > 0 && stepTime < 1.85));
      };
      break;
    }
    case "card": {
      const stand = remember(node("CardStand"));
      const hinge = remember(node("CardHinge"));
      paint("CardCoverFace", canvasFace(512, 360, (c) => drawCover(c, spec.cover)));
      paint("CardInside", canvasFace(512, 360, (c) => drawInside(c, spec.inside)));
      let opened = 0;
      pose = (reduced, sink, dt) => {
        const s = reduced ? 1 : settle(window01(elapsed, 0.7, 0.75));
        if (stand) stand.rotation.x = at(stand)!.rotation.x + 1.18 * s * sink;
        const goal = shown > 0 ? 1 : 0;
        opened = reduced ? goal : THREE.MathUtils.lerp(opened, goal, 1 - Math.exp(-7 * dt));
        if (Math.abs(opened - goal) < 0.002) opened = goal;
        if (hinge) hinge.rotation.z = at(hinge)!.rotation.z + 2.95 * opened * sink;
        return !reduced && (elapsed < 1.5 || opened !== goal);
      };
      resetVisuals = () => (opened = 0);
      break;
    }
    case "stamp": {
      const stamp = remember(node("Stamp"));
      if (stamp) stamp.traverse((n) => n instanceof THREE.Mesh && targets.push(n));
      const cards = spec.cards.map((text, n) => {
        const card = remember(node(`TaskCard${n + 1}`));
        const face = canvasFace(384, 256, (c) => drawTask(c, text, false, n));
        paint(`TaskFace${n + 1}`, face);
        return { card, face, text, inked: false };
      });
      const CARD = 0.0016; // One card's thickness in the stack.
      resetVisuals = () =>
        cards.forEach((entry, n) => {
          if (entry.inked) entry.face.redraw((c) => drawTask(c, entry.text, false, n));
          entry.inked = false;
        });
      pose = (reduced, sink) => {
        // The card being stamped is shown - 1; cards before it are in the tray.
        const active = shown - 1;
        const t = reduced ? 9 : stepTime;
        const reach = active >= 0 ? ease(window01(t, 0, 0.3)) * (1 - ease(window01(t, 0.62, 0.3))) : 0;
        const down = active >= 0 ? ease(window01(t, 0.3, 0.1)) * (1 - ease(window01(t, 0.44, 0.16))) : 0;
        // The contact moment: the ink goes on as the stamp lands. A card already in the tray is inked
        // regardless, in case a slow frame skipped its contact moment.
        cards.forEach((entry, n) => {
          if (entry.inked || n > active || (n === active && t < 0.4)) return;
          entry.inked = true;
          entry.face.redraw((c) => drawTask(c, entry.text, true, n));
        });
        if (stamp) {
          const home = at(stamp)!.position;
          const stackTop = (cards.length - Math.max(active, 0)) * CARD;
          stamp.position.x = home.x - 0.098 * reach;
          stamp.position.y = home.y + (0.016 + stackTop) * reach - (0.016 * down);
        }
        cards.forEach(({ card }, n) => {
          if (!card) return;
          const home = at(card)!.position;
          // In the tray, stacked in the order they were done; the one in flight slides over.
          const slide = n < active ? 1 : n === active ? ease(window01(t, 0.6, 0.35)) : 0;
          const trayHeight = (n - (cards.length - 1 - n)) * CARD; // From its stack slot to its tray slot.
          card.position.x = home.x - 0.084 * slide;
          card.position.y = home.y + trayHeight * slide + 0.004 * Math.sin(Math.PI * slide);
        });
        return !reduced && (elapsed < 1.0 || (active >= 0 && stepTime < 1.0));
      };
      break;
    }
    case "books": {
      // The reading list: nine books reused for every stage. 0: three stacked. 1: two more. 2: two more,
      // leaning right. 3: one more, a wobble, recovery. 4: one more, and the stack topples: the top six
      // lean right together as one stack, tip past their support, then slide apart a little and settle
      // into one loose, fanned row on the tray, the first resting against the three still standing.
      // Back to 0 slides them back over the tray and down into the drawer. All authored, no physics,
      // everything on the tray (local units).
      const T = 0.016; // One book's thickness, as built.
      const BASE = 0.02; // The tray's top.
      const X = -0.17; // The stack's centre, toward the tray's left end; it topples right.
      const books = Array.from({ length: 9 }, (_, n) => node(`ListBook${n + 1}`));
      const COUNTS = [3, 5, 7, 8, 9];
      const YAW = [0.04, -0.06, 0.09, -0.03, 0.07, -0.08, 0.05, 0.12, -0.1];
      const DEPTH = [0, 0.003, -0.002, 0.004, -0.003, 0.002, 0.005, -0.004, 0.003];
      const DRIFT = [0, 0, 0, 0, 0, 0.01, 0.02, 0.028, 0.034]; // From stage 2, the top creeps right.
      type Pose = { p: THREE.Vector3; q: THREE.Quaternion };
      const pose3 = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): Pose => ({
        p: new THREE.Vector3(x, y, z),
        q: new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
      });
      const stacked = (n: number, stage: number) =>
        pose3(X + (stage >= 2 ? DRIFT[n] : 0), BASE + T * (n + 0.5), DEPTH[n], 0, YAW[n], stage >= 2 && n >= 4 ? -0.03 : 0);
      // Behind the tray (which reaches z ±0.058), below its top: where the extra books wait, out of sight.
      const hidden = (n: number) => pose3(X + 0.05 + (n % 3) * 0.04, -0.11, -0.105, 0, YAW[n], 0);
      const WIDTH = (n: number) => 2 * (0.06 - (n % 3) * 0.004); // Each book's width, as built.
      // Where each lands: the three at the bottom stay standing; book 3 leans with its left edge on their
      // top; then 4 to 8 lie in one fanned row, each with its left edge resting on the top of the one
      // before and its right end on the tray. Worked out from that support, so no two books overlap.
      // Slightly tighter on a phone.
      const row = (compact: boolean): Pose[] => {
        const poses: Pose[] = [];
        let left = X + 0.05; // Book 3's left edge, just inside the stack's right edge.
        let top: ((x: number) => number) | null = () => 3 * T; // The surface the next left edge rests on.
        for (let n = 3; n < 9; n++) {
          const L = WIDTH(n);
          const h = Math.max(0, top ? top(left) : 0);
          const theta = Math.asin(Math.min(0.95, h / L)); // Left edge up on its support, right end on the tray.
          const c = Math.cos(theta);
          const sn = Math.sin(theta);
          poses.push(pose3(left + (L / 2) * c + (T / 2) * sn, BASE + h - (L / 2) * sn + (T / 2) * c, DEPTH[n] * 1.5, 0, YAW[n] * 0.3, -theta));
          const tlx = left + T * sn;
          const tly = h + T * c;
          const trx = tlx + L * c;
          const tr = tly - L * sn;
          top = (x) => (x <= tlx ? tly : x >= trx ? 0 : tly + ((x - tlx) / (trx - tlx)) * (tr - tly));
          left += n === 3 ? 0.06 : compact ? 0.038 : 0.042;
        }
        return poses;
      };
      const fallen = (n: number, compact: boolean): Pose => (n < 3 ? stacked(n, 0) : row(compact)[n - 3]);
      const PIVOT = new THREE.Vector3(X + 0.062, BASE + T * 3, 0); // The stack's right edge, above book 3.
      const Z = new THREE.Vector3(0, 0, 1);
      const turn = new THREE.Quaternion();
      const rotated = (pose: Pose, angle: number): Pose => {
        turn.setFromAxisAngle(Z, angle);
        return { p: pose.p.clone().sub(PIVOT).applyQuaternion(turn).add(PIVOT), q: turn.clone().multiply(pose.q) };
      };
      /** The stack's lean through stage 4: a slow lean past its support, then tipping, as one stack. */
      const leanAt = (t: number) => -(0.12 * ease(window01(t, 0.45, 0.5)) + 0.5 * Math.pow(THREE.MathUtils.clamp(window01(t, 0.95, 0.35), 0, 1), 2));
      /** When each book lets go of the tipping stack: the top first, close together. */
      const release = (n: number) => 1.08 + (8 - n) * 0.035;
      type Move = { from: Pose; via?: Pose; to: Pose; delay: number; duration: number; fall: boolean; hideAtEnd: boolean };
      let moves: (Move | null)[] = books.map(() => null);
      let effect: "none" | "wobble" | "topple" = "none";
      let compact = false;
      const current = (n: number): Pose => ({ p: books[n]!.position.clone(), q: books[n]!.quaternion.clone() });
      const place = (n: number, pose: Pose) => {
        const book = books[n];
        if (!book) return;
        book.position.copy(pose.p);
        book.quaternion.copy(pose.q);
      };
      const settleAt = (stage: number) => {
        books.forEach((book, n) => {
          if (!book) return;
          const shownNow = n < COUNTS[Math.min(stage, 3)] || stage >= 4;
          book.visible = shownNow;
          place(n, stage >= 4 ? fallen(n, compact) : shownNow ? stacked(n, stage) : hidden(n));
        });
      };
      settleAt(0);
      /** Where an arriving book appears: just above its place, turned a little. */
      const arrival = (n: number, stage = 3) => {
        const to = stacked(n, stage);
        return pose3(to.p.x, to.p.y + 0.08, to.p.z, 0, YAW[n] + 0.5, 0);
      };
      const plan = (stage: number) => {
        compact = options.compact?.() ?? false;
        effect = stage === 3 ? "wobble" : stage === 4 ? "topple" : "none";
        moves = books.map((book, n) => {
          if (!book) return null;
          const from = current(n);
          if (stage === 0) {
            // Make room: the extras slide back over the tray, then down into the drawer behind it.
            if (n < 3) return { from, to: stacked(n, 0), delay: 0, duration: 0.45, fall: false, hideAtEnd: false };
            if (!book.visible) return null;
            // Up a little, back clear of the tray, then down behind it.
            const back = pose3(from.p.x, Math.max(from.p.y, BASE + T) + 0.03, -0.105, 0, YAW[n], 0);
            return { from, via: back, to: hidden(n), delay: (8 - n) * 0.05, duration: 0.65, fall: false, hideAtEnd: true };
          }
          const before = COUNTS[stage - 1];
          const after = COUNTS[stage];
          if (stage === 4 && n >= 3) {
            if (n === 8) {
              book.visible = true;
              place(n, arrival(8));
            }
            const r = release(n);
            return { from: rotated(stacked(n, 3), leanAt(r)), to: fallen(n, compact), delay: r, duration: 0.5 + (8 - n) * 0.02, fall: true, hideAtEnd: false };
          }
          if (n >= before && n < after) {
            const to = stacked(n, stage);
            const drop = arrival(n, stage);
            book.visible = true;
            place(n, drop);
            return { from: drop, to, delay: (n - before) * 0.18, duration: 0.42, fall: true, hideAtEnd: false };
          }
          if (n < before) return { from, to: stacked(n, stage), delay: 0, duration: 0.5, fall: false, hideAtEnd: false };
          // Not part of this stage (say, still on its way back into the drawer): put it away at once.
          book.visible = false;
          place(n, hidden(n));
          return null;
        });
      };
      const BOUNCE = 0.16;
      const tmp: Pose = { p: new THREE.Vector3(), q: new THREE.Quaternion() };
      const along = (move: Move, t: number) => {
        const u = THREE.MathUtils.clamp((t - move.delay) / move.duration, 0, 1);
        if (move.via) {
          // Two legs: back over the tray, then down.
          if (u < 0.5) tmp.p.lerpVectors(move.from.p, move.via.p, ease(u * 2));
          else tmp.p.lerpVectors(move.via.p, move.to.p, ease(u * 2 - 1));
          tmp.q.slerpQuaternions(move.from.q, move.to.q, ease(u));
        } else {
          // A fall accelerates (and, as a book slides off the tipping stack, keeps a little of its sideways
          // drift); everything else eases.
          const k = move.fall ? u * u : ease(u);
          tmp.p.lerpVectors(move.from.p, move.to.p, move.fall ? 0.35 * u + 0.65 * k : k);
          tmp.p.y = THREE.MathUtils.lerp(move.from.p.y, move.to.p.y, k);
          tmp.q.slerpQuaternions(move.from.q, move.to.q, ease(u));
        }
        const after = t - move.delay - move.duration;
        if (move.fall && after > 0 && after < BOUNCE) tmp.p.y += 0.0025 * Math.sin((Math.PI * after) / BOUNCE);
        return { u, landed: after >= BOUNCE || !move.fall };
      };
      resetVisuals = () => {
        moves = books.map(() => null);
        effect = "none";
        settleAt(0);
      };
      onStep = (stage, reduced) => {
        if (reduced) {
          compact = options.compact?.() ?? false;
          moves = books.map(() => null);
          effect = "none";
          settleAt(stage);
        } else plan(stage);
      };
      pose = (reduced) => {
        if (reduced) return false;
        const t = stepTime;
        let busy = false;
        moves.forEach((move, n) => {
          if (!move || !books[n]) return;
          // Until it lets go, a toppling book rides the stack's lean (the last one drops on first).
          if (effect === "topple" && n >= 3 && t < move.delay) {
            if (n === 8 && t < 0.45) {
              const u = THREE.MathUtils.clamp(t / 0.36, 0, 1);
              const from = arrival(8);
              const to = stacked(8, 3);
              tmp.p.lerpVectors(from.p, to.p, u * u);
              if (t > 0.36) tmp.p.y += 0.003 * Math.sin((Math.PI * (t - 0.36)) / 0.09);
              tmp.q.slerpQuaternions(from.q, to.q, u * u);
              place(n, tmp);
            } else place(n, rotated(stacked(n, 3), leanAt(t)));
            busy = true;
            return;
          }
          const { u, landed } = along(move, t);
          place(n, tmp);
          if (u >= 1 && landed) {
            if (move.hideAtEnd) books[n]!.visible = false;
            moves[n] = null;
          } else busy = true;
        });
        if (effect === "wobble") {
          const w = t - 0.5;
          if (w > 0 && w < 1.5) {
            const angle = -0.09 * Math.sin(2 * Math.PI * 1.5 * w) * Math.exp(-2.6 * w);
            for (let n = 3; n < 8; n++) if (books[n] && !moves[n]) place(n, rotated(stacked(n, 3), angle));
            busy = true;
          } else if (w >= 1.5) effect = "none";
          else busy = true;
        }
        return busy || elapsed < 1.0;
      };
      break;
    }
  }

  return {
    root,
    targets,
    setStep(next) {
      if (next === step) return;
      step = next;
      // The card opens and closes at the visitor's word; the other steps only move forward.
      if (next > shown || spec.kind === "card" || spec.kind === "books") {
        shown = next;
        stepTime = 0;
        onStep(next, reducedNow);
      }
      // A step back to 0 is a reset: applied once the drawer is shut (see update), so it never shows.
    },
    update(dt, open, opening, reduced) {
      reducedNow = reduced;
      if (opening) {
        if (wasShut) elapsed = 0;
        wasShut = false;
        elapsed += dt;
      }
      stepTime += dt;
      const shut = !opening && open <= 0.0005;
      if (shut) {
        if (wasShut) return false;
        wasShut = true;
        elapsed = 0;
        shown = step;
        stepTime = 99;
        resetVisuals();
        placeLift(true, 0);
        pose(true, 0, dt);
        root.visible = false;
        return false;
      }
      // Reopened before it had shut, after the visitor's progress was reset: start over now.
      if (opening && step < shown) {
        shown = step;
        stepTime = 99;
        resetVisuals();
      }
      root.visible = true;
      const sink = reduced ? (opening ? 1 : 0) : THREE.MathUtils.smoothstep(open, 0.35, 1);
      placeLift(reduced, sink);
      const moving = pose(reduced, sink, dt);
      // Closing hides the tickets at once: they're on the KDS, not in the drawer.
      if (!opening && spec.kind === "bell") resetVisuals();
      return moving || (!reduced && open < 1 && opening);
    },
    dispose() {
      owned.forEach((item) => item.dispose());
    },
  };
}
