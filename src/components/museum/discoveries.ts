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

/** How far left of the drawer's centre the reading list stands, in metres. */
const BOOK_SHIFT = -0.17;
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
  /** How far the drawer slides out, in metres. */
  travel?: number;
  /** Whether the screen is portrait (a tighter spill). */
  compact?: () => boolean;
}): DrawerDiscovery {
  const { spec, drawer, anchor } = options;
  const root = options.template.clone(true);
  root.position.copy(anchor);
  // A little larger than built, so each reads at gallery distance; the lift below is in world terms.
  const scale = SCALE[spec.kind];
  root.scale.setScalar(scale);
  // The reading list stands toward the drawer's left end, so its avalanche can reach the cabinet top.
  if (spec.kind === "books") root.position.x += BOOK_SHIFT;
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
  let openingNow = false;

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
      const trayMark = screen ? named(screen, "ChitTrayAnchor") : null;
      const LMAX = 0.07;
      const W = 0.044;
      const ROWS = 24;
      const trayAt = new THREE.Vector3();
      if (slot && trayMark) slot.worldToLocal(trayMark.getWorldPosition(trayAt));
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
            // In the tray: lying toward the visitor, its far end curling up a little.
            const q = p / LMAX;
            // Centred in the tray (its anchor marks the front lip, 33 mm ahead of the tray's middle).
            flat.set(trayAt.x, trayAt.y + 0.0012 + 0.006 * q * q, trayAt.z - 0.033 - LMAX / 2 + p);
            point.lerp(flat, toTray);
            point.y += 0.012 * 4 * toTray * (1 - toTray);
          }
          for (let side = 0; side < 2; side++) chit.positions.set([(side - 0.5) * W, point.y, point.z], (r * 2 + side) * 3);
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
      // leaning left. 3: one more, a wobble, recovery. 4: one more, then an avalanche. The stack leans past
      // its support and tips; the top books tumble over the drawer's left end onto the cabinet top beside
      // the case (the floor is out of the resting camera's frame), one drapes over the drawer's side, one
      // teeters on its front edge, the rest land askew on the tray. Back to 0 tidies them into the drawer.
      // All authored, no physics. Poses are local to the tray; spill targets are given in world terms
      // (relative to the cabinet) and converted, since some land outside the drawer.
      const T = 0.016; // One book's thickness, as built.
      const BASE = 0.02; // The tray's top, in its own units.
      const books = Array.from({ length: 9 }, (_, n) => node(`ListBook${n + 1}`));
      const COUNTS = [3, 5, 7, 8, 9];
      const YAW = [0.04, -0.06, 0.09, -0.03, 0.07, -0.08, 0.05, 0.12, -0.1];
      const DEPTH = [0, 0.003, -0.002, 0.004, -0.003, 0.002, 0.005, -0.004, 0.003];
      const DRIFT = [0, 0, 0, 0, 0, -0.012, -0.022, -0.03, -0.036]; // From stage 2, the top leans left.
      type Pose = { p: THREE.Vector3; q: THREE.Quaternion };
      const pose3 = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): Pose => ({
        p: new THREE.Vector3(x, y, z),
        q: new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
      });
      // The tray's origin, fully open and lifted, relative to the cabinet's centre (x) and absolute (y, z).
      const O = { x: BOOK_SHIFT, y: anchor.y + RISE, z: anchor.z + (options.travel ?? 0.17) };
      /** A pose given in world terms (x from the cabinet's centre), in the tray's local units. */
      const world = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) =>
        pose3((x - O.x) / scale, (y - O.y) / scale, (z - O.z) / scale, rx, ry, rz);
      const stacked = (n: number, stage: number) =>
        pose3(stage >= 2 ? DRIFT[n] : 0, BASE + T * (n + 0.5), DEPTH[n], 0, YAW[n], stage >= 2 && n >= 4 ? 0.03 : 0);
      const hidden = (n: number) => pose3((n % 3) * 0.02 - 0.02, -0.11, -0.075, 0, YAW[n], 0);
      const CAB_TOP = 0.78;
      const TRAY_TOP = O.y + BASE * scale; // In world terms.
      const half = (T * scale) / 2;
      // The avalanche's end state, world terms. The top three books go over the drawer's left side and land
      // in a heap on the cabinet top beside the case: one flat, one askew on it, one caught half over the
      // cabinet's edge. (The floor in front of the cabinet is below the resting camera's frame on a
      // desktop and under the drawer's panel on a phone, so the heap lands where it can be seen.) On a
      // phone the heap sits a little further forward, nearer the frame's centre.
      const pile = (n: number, compact: boolean): Pose =>
        [
          stacked(0, 0),
          stacked(1, 0),
          world(BOOK_SHIFT + 0.006, TRAY_TOP + 2.5 * T * scale, O.z, 0, 0.32, 0.04),
          world(-0.12, 0.695 + half + 0.004, 0.235, 0.28, 0.1, 0), // Teetering on the front edge.
          world(-0.07, TRAY_TOP + half, O.z + 0.01, 0, -0.45, 0.05),
          world(-0.358, 0.673 + half + 0.012, 0.13, 0, 0.15, 0.5), // Draped over the drawer's left side.
          world(-0.432, CAB_TOP + half + 0.006, compact ? -0.12 : -0.2, 0, 1.75, 0.3), // Caught half over the edge.
          world(-0.398, CAB_TOP + half * 3 + 0.002, compact ? 0.0 : -0.05, 0.04, 1.5, 0.12), // Askew on book 8.
          world(-0.393, CAB_TOP + half, compact ? -0.05 : -0.1, 0, 1.62, 0), // Flat on the cabinet top.
        ][n];
      /** The way each book travels in the avalanche (between where it tips from and where it lands). */
      const route = (n: number): Pose[] =>
        // Up and over the drawer's left side, past its end and in front of the cabinet, clear of the case.
        n >= 6
          ? [world(-0.43, 0.9 + (8 - n) * 0.02, 0.17, 0.3, 0.9 + (n - 6) * 0.2, 1.1)]
          : n === 5
            ? [world(-0.31, 0.79, 0.14, 0, 0.1, 0.25)] // Above the drawer's side wall, so it never cuts through it.
            : [];
      const PIVOT = new THREE.Vector3(-0.062, BASE + T * 3, 0); // The stack's left edge, above book 3.
      const Z = new THREE.Vector3(0, 0, 1);
      const turn = new THREE.Quaternion();
      const rotated = (pose: Pose, angle: number): Pose => {
        turn.setFromAxisAngle(Z, angle);
        return { p: pose.p.clone().sub(PIVOT).applyQuaternion(turn).add(PIVOT), q: turn.clone().multiply(pose.q) };
      };
      /** The stack's lean through stage 4: a slow lean past its support, a hold, then tipping. */
      const leanAt = (t: number) => 0.14 * ease(window01(t, 0.45, 0.5)) + 0.42 * Math.pow(THREE.MathUtils.clamp(window01(t, 0.95, 0.3), 0, 1), 2);
      // A move from one pose to another, optionally via a waypoint: delay, duration, an arc, and whether
      // it's a fall (accelerating) that lands with a soft bounce.
      type Move = { from: Pose; via?: Pose[]; to: Pose; delay: number; duration: number; arc: number; fall: boolean; hideAtEnd: boolean };
      let moves: (Move | null)[] = books.map(() => null);
      let effect: "none" | "wobble" | "spill" = "none";
      let compact = false;
      const outside = new Set<number>(); // Books that can be outside the drawer: put away at once on closing.
      const current = (n: number): Pose => ({ p: books[n]!.position.clone(), q: books[n]!.quaternion.clone() });
      const place = (n: number, pose: Pose) => {
        const book = books[n];
        if (!book) return;
        book.position.copy(pose.p);
        book.quaternion.copy(pose.q);
      };
      const settleAt = (stage: number) => {
        outside.clear();
        books.forEach((book, n) => {
          if (!book) return;
          const shownNow = n < COUNTS[Math.min(stage, 3)] || stage >= 4;
          book.visible = shownNow;
          place(n, stage >= 4 ? pile(n, compact) : shownNow ? stacked(n, stage) : hidden(n));
          if (stage >= 4 && n >= 3) outside.add(n);
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
        effect = stage === 3 ? "wobble" : stage === 4 ? "spill" : "none";
        moves = books.map((book, n) => {
          if (!book) return null;
          const from = current(n);
          if (stage === 0) {
            // Make room: the extras go back over the tray and down into the drawer; the two on the cabinet
            // top come back the way they went.
            if (n < 3) return { from, to: stacked(n, 0), delay: 0, duration: 0.45, arc: 0.004, fall: false, hideAtEnd: false };
            if (!book.visible) return null;
            const away = (8 - n) * 0.05;
            const back = route(n).reverse();
            if (back.length && outside.has(n)) return { from, via: back, to: hidden(n), delay: away, duration: 0.5 + 0.3 * back.length, arc: 0.02, fall: false, hideAtEnd: true };
            return { from, to: hidden(n), delay: away, duration: 0.55, arc: 0.035, fall: false, hideAtEnd: true };
          }
          const before = COUNTS[stage - 1];
          const after = COUNTS[stage];
          if (stage === 4 && n >= 3) {
            outside.add(n);
            if (n === 8) {
              book.visible = true;
              place(n, arrival(8));
            }
            const delay = 1.15 + (8 - n) * 0.06;
            const tipped = rotated(stacked(n, 3), leanAt(delay)); // Exactly where the lean has it when it goes.
            const via = route(n);
            if (via.length) return { from: tipped, via, to: pile(n, compact), delay, duration: 0.5 + 0.28 * via.length, arc: 0.012, fall: true, hideAtEnd: false };
            return { from: tipped, to: pile(n, compact), delay, duration: 0.5 + (n % 3) * 0.06, arc: 0.03, fall: true, hideAtEnd: false };
          }
          if (stage === 4 && n === 2) return { from, to: pile(2, compact), delay: 1.4, duration: 0.32, arc: 0.006, fall: false, hideAtEnd: false };
          if (n >= before && n < after) {
            // A new arrival: dropped in from just above, landing softly.
            const to = stacked(n, stage);
            const drop = arrival(n, stage);
            book.visible = true;
            place(n, drop);
            return { from: drop, to, delay: (n - before) * 0.18, duration: 0.42, arc: 0, fall: true, hideAtEnd: false };
          }
          if (n < before) return { from, to: stacked(n, stage), delay: 0, duration: 0.5, arc: 0, fall: false, hideAtEnd: false };
          // Not part of this stage (say, still on its way back into the drawer from an earlier reset): put
          // it away at once, so no book is ever left frozen mid-move.
          book.visible = false;
          place(n, hidden(n));
          return null;
        });
      };
      const BOUNCE = 0.16;
      const tmp: Pose = { p: new THREE.Vector3(), q: new THREE.Quaternion() };
      const leg = (a: Pose, b: Pose, u: number, fall: boolean, arc: number) => {
        const k = fall ? u * u : ease(u);
        tmp.p.lerpVectors(a.p, b.p, k);
        tmp.p.y += arc * 4 * u * (1 - u);
        tmp.q.slerpQuaternions(a.q, b.q, ease(u));
      };
      const along = (move: Move, t: number) => {
        const u = THREE.MathUtils.clamp((t - move.delay) / move.duration, 0, 1);
        if (move.via?.length) {
          // Off the stack and out over an edge (decelerating), then falling (accelerating), leg by leg.
          const points = [move.from, ...move.via, move.to];
          const first = 1 / (points.length - 1);
          if (u < first) {
            const v = u / first;
            tmp.p.lerpVectors(points[0].p, points[1].p, 1 - (1 - v) * (1 - v));
            tmp.q.slerpQuaternions(points[0].q, points[1].q, v);
          } else {
            // The rest is one continuous fall along the route, accelerating the whole way.
            const w = (u - first) / (1 - first);
            const lengths = points.slice(2).map((q, k) => q.p.distanceTo(points[k + 1].p));
            const total = lengths.reduce((a, b) => a + b, 0) || 1;
            let d = (move.fall ? w * w : ease(w)) * total;
            let k = 0;
            while (k < lengths.length - 1 && d > lengths[k]) d -= lengths[k++];
            const f = lengths[k] ? Math.min(1, d / lengths[k]) : 1;
            tmp.p.lerpVectors(points[k + 1].p, points[k + 2].p, f);
            tmp.q.slerpQuaternions(points[k + 1].q, points[k + 2].q, f);
          }
        } else leg(move.from, move.to, u, move.fall, move.arc);
        // A restrained landing: a small rebound that settles.
        const after = t - move.delay - move.duration;
        if (move.fall && after > 0 && after < BOUNCE) tmp.p.y += 0.003 * Math.sin((Math.PI * after) / BOUNCE);
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
        // Closing: anything that could be outside the drawer is put away at once, never dragged in.
        if (!openingNow && outside.size) {
          outside.forEach((n) => {
            if (books[n]) books[n]!.visible = false;
            moves[n] = null;
          });
          outside.clear();
        }
        if (reduced) return false;
        const t = stepTime;
        let busy = false;
        moves.forEach((move, n) => {
          if (!move || !books[n]) return;
          // Before a spilling book's own flight: it rides the stack's lean.
          if (effect === "spill" && n >= 3 && t < move.delay) {
            if (n === 8 && t < 0.45) {
              // The last book's arrival, before the lean.
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
            if (move.hideAtEnd) {
              books[n]!.visible = false;
              outside.delete(n);
            }
            moves[n] = null;
          } else busy = true;
        });
        // The wobble: the upper books rock about the stack's edge, then steady.
        if (effect === "wobble") {
          const w = t - 0.5;
          if (w > 0 && w < 1.5) {
            const angle = 0.09 * Math.sin(2 * Math.PI * 1.5 * w) * Math.exp(-2.6 * w);
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
      openingNow = opening;
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
