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
export const STEP_MS = { bell: 650, stamp: 1150, card: 700, books: [950, 900, 950, 2100, 2300] } as const;

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
  const RISE = 0.11;
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
      resetVisuals = () => tickets.forEach(({ mesh }) => mesh && (mesh.visible = false));
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
        return !reduced && (elapsed < 1.0 || (shown > 0 && stepTime < 0.6));
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
      // drifting off-centre. 3: one more, a wobble, recovery. 4: one more, then a spill into a composed
      // pile. Back to 0 tidies the extras away into the drawer. All authored, no physics.
      const T = 0.016; // One book's thickness.
      const X0 = -0.035; // The stack's centre.
      const books = Array.from({ length: 9 }, (_, n) => node(`ListBook${n + 1}`));
      const COUNTS = [3, 5, 7, 8, 9];
      const YAW = [0.04, -0.06, 0.09, -0.03, 0.07, -0.08, 0.05, 0.12, -0.1];
      const DEPTH = [0, 0.003, -0.002, 0.004, -0.003, 0.002, 0.005, -0.004, 0.003];
      const DRIFT = [0, 0, 0, 0, 0, 0.012, 0.024, 0.03, 0.036]; // From stage 2, the top leans right.
      type Pose = { p: THREE.Vector3; q: THREE.Quaternion };
      const pose3 = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): Pose => ({
        p: new THREE.Vector3(x, y, z),
        q: new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
      });
      const stacked = (n: number, stage: number) =>
        pose3(X0 + (stage >= 2 ? DRIFT[n] : 0), T * (n + 0.5), DEPTH[n], 0, YAW[n], stage >= 2 && n >= 4 ? -0.03 : 0);
      const hidden = (n: number) => pose3(X0 + (n % 3) * 0.02, -0.11, -0.075, 0, YAW[n], 0);
      // The pile: on the tray, propped against the stack, one over the drawer front. Tighter on a phone.
      const pile = (n: number, compact: boolean) => {
        const k = compact ? 0.72 : 1;
        const at = (x: number, y: number, z: number, rx: number, ry: number, rz: number) => pose3(X0 + (x - X0) * k, y, z, rx, ry, rz);
        return [
          at(X0, T * 0.5, 0, 0, 0.04, 0),
          at(X0, T * 1.5, 0.003, 0, -0.06, 0),
          at(X0 + 0.006, T * 2.5, -0.002, 0, 0.22, 0),
          at(0.102, T * 0.5, 0.005, 0, -0.35, 0),
          at(0.108, T * 1.5 + 0.002, -0.004, 0.05, 0.3, 0.06),
          at(0.034, 0.058, 0.004, 0, 0.1, -1.05),
          // Teetering on the drawer front's top edge, tipped a little toward the visitor.
          at(-0.005, 0.0028, 0.085, 0.25, 0.12, 0),
          at(X0 + 0.004, T * 3.5 + 0.002, 0, 0.08, 0.7, -0.05),
          at(X0 - 0.083, 0.03, 0.01, 0, -0.3, 1.0),
        ][n];
      };
      /** Where an arriving book appears: just above its place, turned a little. */
      const arrival = (n: number, stage = 3) => {
        const to = stacked(n, stage);
        return pose3(to.p.x, to.p.y + 0.08, to.p.z, 0, YAW[n] + 0.5, 0);
      };
      const PIVOT = new THREE.Vector3(X0 + 0.062, T * 3, 0); // The stack's right edge, above book 3.
      const Z = new THREE.Vector3(0, 0, 1);
      const turn = new THREE.Quaternion();
      const rotated = (pose: Pose, angle: number): Pose => {
        turn.setFromAxisAngle(Z, angle);
        return { p: pose.p.clone().sub(PIVOT).applyQuaternion(turn).add(PIVOT), q: turn.clone().multiply(pose.q) };
      };
      // A move from one pose to another: delay, duration, an arc, and whether it's a fall (eases in) that
      // lands with a soft bounce.
      type Move = { from: Pose; to: Pose; delay: number; duration: number; arc: number; fall: boolean; hideAtEnd: boolean };
      let moves: (Move | null)[] = books.map(() => null);
      let effect: "none" | "wobble" | "spill" = "none";
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
          place(n, stage >= 4 ? pile(n, compact) : shownNow ? stacked(n, stage) : hidden(n));
        });
      };
      settleAt(0);
      const plan = (stage: number) => {
        compact = options.compact?.() ?? false;
        effect = stage === 3 ? "wobble" : stage === 4 ? "spill" : "none";
        moves = books.map((book, n) => {
          if (!book) return null;
          const from = current(n);
          if (stage === 0) {
            // Make room: the extras lift a touch, back over the tray, and down into the drawer.
            if (n < 3) return { from, to: stacked(n, 0), delay: 0, duration: 0.45, arc: 0.004, fall: false, hideAtEnd: false };
            if (!book.visible) return null;
            return { from, to: hidden(n), delay: (8 - n) * 0.04, duration: 0.55, arc: 0.03, fall: false, hideAtEnd: true };
          }
          const before = COUNTS[stage - 1];
          const after = COUNTS[stage];
          if (stage === 4 && n >= 3) {
            // The last book drops on, the stack tips, and everything above book 3 tumbles into the pile.
            if (n === 8) {
              book.visible = true;
              place(n, arrival(8));
            }
            const tipped = rotated(stacked(n, 3), -0.5);
            return { from: tipped, to: pile(n, compact), delay: 1.0 + (8 - n) * 0.07, duration: 0.5 + (n % 3) * 0.05, arc: 0.022, fall: true, hideAtEnd: false };
          }
          if (n >= before && n < after) {
            // A new arrival: dropped in from just above, landing softly.
            const to = stacked(n, stage);
            const drop = arrival(n, stage);
            book.visible = true;
            place(n, drop);
            return { from: drop, to, delay: (n - before) * 0.18, duration: 0.42, arc: 0, fall: true, hideAtEnd: false };
          }
          if (stage === 4 && n === 2) return { from, to: pile(2, compact), delay: 1.15, duration: 0.3, arc: 0, fall: false, hideAtEnd: false };
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
      const along = (move: Move, t: number) => {
        const u = THREE.MathUtils.clamp((t - move.delay) / move.duration, 0, 1);
        const k = move.fall ? u * u : ease(u);
        tmp.p.lerpVectors(move.from.p, move.to.p, k);
        tmp.p.y += move.arc * 4 * u * (1 - u);
        // A soft landing: a small rebound that settles.
        const after = t - move.delay - move.duration;
        if (move.fall && after > 0 && after < BOUNCE) tmp.p.y += 0.0035 * Math.sin((Math.PI * after) / BOUNCE);
        tmp.q.slerpQuaternions(move.from.q, move.to.q, k);
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
          // Before a spilling book's own flight: it tips over with the stack.
          if (effect === "spill" && n >= 3 && t < move.delay) {
            const tip = -0.5 * Math.pow(THREE.MathUtils.clamp((t - 0.65) / 0.35, 0, 1), 2);
            if (n === 8 && t < 0.6) {
              // The last book's arrival, before the tip.
              const u = THREE.MathUtils.clamp(t / 0.42, 0, 1);
              const from = arrival(8);
              const to = stacked(8, 3);
              tmp.p.lerpVectors(from.p, to.p, u * u);
              if (t > 0.42) tmp.p.y += 0.0035 * Math.sin((Math.PI * (t - 0.42)) / 0.18);
              tmp.q.slerpQuaternions(from.q, to.q, u * u);
              place(n, tmp);
            } else place(n, rotated(stacked(n, 3), tip));
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
