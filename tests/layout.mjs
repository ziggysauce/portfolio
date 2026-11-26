// Layout and visibility check for the museum hall, in a real browser with WebGL. It fails on what a
// visitor would see go wrong:
//
//  1. Every stop at every size (wide sizes with the field guide open and folded): the placard is on screen
//     and clear of the title block, navigation, field guide and pager. With its drawer open, the
//     discovery's whole sequence (stepped to its end) stays clear of the placard, guide, pager and header,
//     there is one way back (Back to exhibit), focus moves into the drawer, and Escape brings it back.
//  2. Walking by scrolling (vertical, horizontal, diagonal wheel and trackpad input, both ways), and the
//     fling that used to drag the gallery off screen: the hall never shifts sideways or leaves a blank area.
//  3. Folding and opening the guide at the first, middle and last stops, with a drawer open too.
//  4. Resizing after load, from desktop to a short laptop to a phone and back.
//  5. Reduced motion, and the page without WebGL.
//  6. Phones and short landscape screens: the exhibit itself (its case and deck, from the hall) is on screen,
//     clear of the header, placard and bottom bar, and big enough to recognise, before anything is opened;
//     Read exhibit unfolds the rest of the placard with the case still in view, scrolls inside itself
//     without walking the hall, and folds again on Escape.
//  7. Constrained screens (short landscape, or under 1000px wide): the open guide overlays the hall. Focus
//     stays in it, the hall can't be walked behind it, Escape and the scrim close it, focus goes back to
//     what opened it, and the stop, an open drawer and unfolded details are just as they were. Choosing a
//     stop closes it and walks there. Turning or resizing with it open lands in each size's own form.
//  8. A drawer opening and closing: the placard eases to its new place and size over several frames (no
//     jump), lands where it did before, and nothing is left mid-ease after a quick open and close, walking
//     on, or a resize; with reduced motion it doesn't ease at all.
//
// Where each discovery is on screen comes from the hall itself (?debug, see MuseumHall placeLabels), so
// the check measures the 3D objects' space, not just the HTML. Look at the screenshots as well.
//
//   npm run build && npm run test:layout                     the built site in out/
//   VERCEL_ENV=preview npm run build && npm run test:layout  with draft case studies: the labels' tallest form
//   npm run test:layout -- --url https://…vercel.app         a deployed preview
//   npm run test:layout -- --sizes 1280x720,375x667          some sizes only
//
// Uses the installed Google Chrome (playwright-core downloads no browser). Set CHROME_PATH to use another
// Chromium build. Screenshots of every state go to test-results/layout/ for a look by eye: the geometry
// checks catch collisions, not ugliness.

import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
};

const SIZES = {
  "1280x744": { viewport: { width: 1280, height: 744 } },
  "1280x720": { viewport: { width: 1280, height: 720 } },
  "1366x768": { viewport: { width: 1366, height: 768 } },
  "1440x900": { viewport: { width: 1440, height: 900 } },
  "1280x600": { viewport: { width: 1280, height: 600 } },
  "390x844": { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  "375x667": { viewport: { width: 375, height: 667 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  "844x390": { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  "667x375": { viewport: { width: 667, height: 375 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};
const only = arg("sizes")?.split(",");
const unknown = only?.filter((size) => !(size in SIZES)) ?? [];
if (unknown.length) {
  console.error(`Unknown size ${unknown.join(", ")}. Known: ${Object.keys(SIZES).join(", ")}`);
  process.exit(2);
}
const shots = path.join(root, "test-results", "layout");

// The static export, served the way the host serves it: /about → about.html, / → index.html.
async function serveOut() {
  const out = path.join(root, "out");
  await fs.access(path.join(out, "index.html")).catch(() => {
    throw new Error("No build in out/. Run `npm run build` first (or pass --url).");
  });
  const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".glb": "model/gltf-binary", ".woff2": "font/woff2", ".txt": "text/plain", ".pdf": "application/pdf", ".wasm": "application/wasm", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff": "font/woff", ".ico": "image/x-icon" };
  const server = createServer(async (req, res) => {
    let clean;
    try {
      clean = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/\/+$/, "") || "/index";
    } catch {
      res.writeHead(400).end();
      return;
    }
    for (const candidate of [clean, `${clean}.html`, `${clean}/index.html`]) {
      const file = path.join(out, candidate);
      if (!file.startsWith(out + path.sep)) break;
      const stat = await fs.stat(file).catch(() => null);
      if (stat?.isFile()) {
        res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" });
        res.end(await fs.readFile(file));
        return;
      }
    }
    res.writeHead(404, { "content-type": "text/html" });
    res.end(await fs.readFile(path.join(out, "404.html")).catch(() => "Not found"));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}

const local = arg("url") ? null : await serveOut();
const base = (arg("url") ?? local.url).replace(/\/$/, "");
await fs.mkdir(shots, { recursive: true });

// WebGL in headless Chrome: Metal on a Mac, SwiftShader elsewhere (CI machines have no GPU).
const gl = process.platform === "darwin" ? ["--use-angle=metal", "--ignore-gpu-blocklist"] : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"];
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: gl } : { channel: "chrome", args: gl });

let failed = 0;
let total = 0;
const report = (name, problems, detail = "") => {
  total++;
  if (problems.length) failed++;
  console.log(`${problems.length ? "FAIL" : "ok  "}  ${name}${problems.length ? `  · ${problems.join("; ")}` : ""}${detail ? `  (${detail})` : ""}`);
};

// Everything a visitor sees on top of the hall, in viewport pixels.
const scan = (page, selector) =>
  page.evaluate((selector) => {
    const edges = (el) => {
      const b = el.getBoundingClientRect();
      return { x: b.left, y: b.top, r: b.right, b: b.bottom, w: b.width };
    };
    const el = selector ? document.querySelector(selector) : null;
    const canvas = document.querySelector("canvas");
    const shifted = [];
    // Panels that scroll themselves (placards, the guide, the sheet) are allowed to; nothing else is.
    for (const node of document.querySelectorAll("body *")) if ((node.scrollLeft || node.scrollTop) && !node.closest("article, #field-guide, #guide-sheet")) shifted.push(`${node.tagName.toLowerCase()}.${String(node.className).split(" ")[0]} scrolled ${node.scrollLeft},${node.scrollTop}`);
    const hall = window.__hall ?? { discoveries: [], open: null };
    return {
      box: el ? edges(el) : null,
      // Visually hidden pieces (the hall's name on a phone, kept for screen readers) are 1px and take no room.
      header: [...document.querySelectorAll("header > div > *, header > nav")].map(edges).filter((e) => e.w > 1),
      guide: [...document.querySelectorAll("#field-guide, [aria-controls=field-guide]")].map(edges).filter((e) => e.w > 0),
      bottom: [...document.querySelectorAll("[class*=sheetHandle], [class*=controls]")].map(edges).filter((e) => e.w > 0),
      canvas: canvas ? edges(canvas) : null,
      scrollX: window.scrollX,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      shifted,
      discoveries: hall.discoveries.map((d) => (d ? { x: d.left, y: d.top, r: d.right, b: d.bottom } : null)),
      subjects: (hall.subjects ?? []).map((d) => (d ? { x: d.left, y: d.top, r: d.right, b: d.bottom } : null)),
      vw: innerWidth,
      vh: innerHeight,
    };
  }, selector);
const meets = (a, c) => a.x < c.r - 1 && a.r > c.x + 1 && a.y < c.b - 1 && a.b > c.y + 1;
const px = (r) => `${Math.round(r.x)},${Math.round(r.y)} to ${Math.round(r.r)},${Math.round(r.b)}`;
/** The box under test is on screen and clear of the header, guide and pager. */
const fits = (g) => {
  if (!g.box) return ["not found"];
  const problems = [];
  // Nothing to collide with would make every check pass: the selectors must still find the page's parts.
  if (g.header.length < 1) problems.push("found no header pieces; has the navigation changed?");
  if (g.bottom.length < 1) problems.push("found no pager; has it changed?");
  const { box } = g;
  if (box.y < -0.5 || box.b > g.vh + 0.5 || box.x < -0.5 || box.r > g.vw + 0.5) problems.push(`clipped by the screen (${px(box)})`);
  for (const h of g.header) if (meets(box, h)) problems.push(`runs into the header (piece at ${px(h)})`);
  for (const c of g.bottom) if (meets(box, c)) problems.push(`runs into the pager or guide handle (top ${Math.round(c.y)})`);
  for (const r of g.guide) if (meets(box, r)) problems.push(`runs into the field guide (its right edge at ${Math.round(r.r)})`);
  return problems;
};
/** The gallery is where it belongs: nothing scrolled sideways, the canvas filling the screen. */
const inPlace = (g) => {
  const problems = [];
  if (g.scrollX) problems.push(`window scrolled sideways by ${g.scrollX}px`);
  if (g.overflowX > 0) problems.push(`page ${g.overflowX}px wider than the screen`);
  problems.push(...g.shifted);
  if (g.canvas && (Math.abs(g.canvas.x) > 0.5 || Math.abs(g.canvas.y) > 0.5 || Math.abs(g.canvas.r - g.vw) > 0.5)) problems.push(`canvas displaced to ${px(g.canvas)}`);
  return problems;
};
/** The open drawer's discovery (its whole sequence's space) is on screen and nothing covers it. */
const discoveryClear = (g, n) => {
  const d = g.discoveries[n - 1];
  if (!d) return ["the hall reported no discovery area (is ?debug working?)"];
  const problems = [];
  if (d.x < -0.5 || d.r > g.vw + 0.5 || d.y < -0.5 || d.b > g.vh + 0.5) problems.push(`discovery off screen (${px(d)})`);
  if (g.box && meets(d, g.box)) problems.push(`placard covers the discovery (${px(d)})`);
  for (const r of g.guide) if (meets(d, r)) problems.push("field guide covers the discovery");
  for (const c of g.bottom) if (meets(d, c)) problems.push("pager or guide handle covers the discovery");
  for (const h of g.header) if (meets(d, h)) problems.push("header covers the discovery");
  return problems;
};

/**
 * The exhibit itself (the case and its deck, or the desktop and bell at the desk) before anything is opened:
 * on screen, nothing over it, and at least `share` of the screen's width, so it reads at a glance.
 */
const exhibitClear = (g, n, share) => {
  const d = g.subjects[n - 1];
  if (!d) return ["the hall reported no exhibit area (is ?debug working?)"];
  const problems = [];
  if (d.x < -0.5 || d.r > g.vw + 0.5 || d.y < -0.5 || d.b > g.vh + 0.5) problems.push(`exhibit off screen (${px(d)})`);
  if (g.box && meets(d, g.box)) problems.push(`placard covers the exhibit (${px(d)}, placard top ${Math.round(g.box.y)})`);
  for (const c of g.bottom) if (meets(d, c)) problems.push("bottom bar covers the exhibit");
  for (const h of g.header) if (meets(d, h)) problems.push(`header covers the exhibit (${px(d)})`);
  for (const r of g.guide) if (meets(d, r)) problems.push("field guide covers the exhibit");
  if (d.r - d.x < g.vw * share) problems.push(`exhibit only ${Math.round(d.r - d.x)}px wide`);
  return problems;
};
/** With the details unfolded: at least `least` of the exhibit's height still shows between header and placard. */
const exhibitShows = (g, n, least) => {
  const d = g.subjects[n - 1];
  if (!d || !g.box) return ["no exhibit or placard"];
  const top = Math.max(d.y, ...g.header.filter((h) => h.x < d.r && h.r > d.x).map((h) => h.b), 0);
  const bottom = Math.min(d.b, g.box.y);
  const shown = Math.max(0, bottom - top) / (d.b - d.y);
  return shown < least ? [`only ${Math.round(shown * 100)}% of the exhibit shows (${px(d)}, placard top ${Math.round(g.box.y)})`] : [];
};

const ready = (page) =>
  page.waitForFunction(() => document.querySelector("canvas") && !document.querySelector("[role=status]")?.textContent?.includes("Turning on the lights"), null, { timeout: 45000 });
const counter = (page) => page.locator("[class*=counter][aria-live=polite]").innerText().then((t) => t.replace(/\s+/g, " ").trim());
// Stops 1 to 6 are the cases; 7 is the desk (the last item: the fatherhood card sits between).
const placard = (n) => (n === 7 ? "ol[aria-label] > li:last-child article" : `ol[aria-label] > li:nth-child(${n}) article`);
const openButton = (n) => `${placard(n)} button[aria-controls$="-drawer"][aria-expanded="false"]`;
const shot = (page, name) => page.screenshot({ path: path.join(shots, `${name.replace(/[^\w-]+/g, "-")}.png`) });
async function open(context, rail) {
  if (rail) await context.addInitScript((state) => localStorage.setItem("museum-guide", state), rail);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}/?debug`);
  await ready(page);
  await page.waitForTimeout(2400);
  return { page, errors };
}
/** Back to the first stop, and really there: a jump can be overtaken by a walk that's still settling. */
async function toStart(page) {
  for (let attempt = 0; attempt < 5; attempt++) {
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(1500);
    if ((await counter(page)).includes("001 /")) return;
  }
  throw new Error(`couldn't get back to the first stop (at "${await counter(page)}")`);
}
/**
 * The hall at rest: the camera on a stop (whole-number progress) and the picture's slide unchanged for a
 * quarter second, from the hall's own state (?debug). An observable settled state, not a fixed wait: a slow
 * or stalled walk fails here instead of being measured halfway.
 */
const settle = (page, from = null) =>
  page.waitForFunction(
    (from) => {
      const hall = window.__hall;
      const api = window.__museumApi;
      if (!hall || !api) return false;
      const slide = api.offset();
      const key = `${hall.progress.toFixed(3)}|${slide.x.toFixed(1)}|${slide.y.toFixed(1)}`;
      const seen = (window.__settle ??= { key: "", since: 0 });
      const now = performance.now();
      if (seen.key !== key) {
        seen.key = key;
        seen.since = now;
        return false;
      }
      // After a step, at rest somewhere else: a hall still at rest where it was hasn't started yet.
      const moved = from === null || Math.round(hall.progress) !== from;
      return moved && Math.abs(hall.progress - Math.round(hall.progress)) < 0.002 && now - seen.since > 250;
    },
    from,
    { timeout: 8000, polling: 50 },
  );
const stopNow = (page) => page.evaluate(() => Math.round(window.__hall?.progress ?? 0));
async function step(page, name) {
  const before = await counter(page);
  const from = await stopNow(page);
  await page.locator("[class*=controls]").getByRole("button", { name }).click({ timeout: 5000 });
  await settle(page, from);
  const now = await counter(page);
  if (now === before) throw new Error(`the walk didn't move from "${now}"`);
}
const next = (page) => step(page, /^Next/);
const prev = (page) => step(page, /^Previous/);
/** Opens stop n's drawer from its placard button, as a keyboard visitor would. */
async function openDrawer(page, n) {
  await page.locator(openButton(n)).focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1900);
}
/** The drawer's action (ring, stamp, read the card, the reading list), pressed through to the end. */
async function playDrawer(page, n, check) {
  for (let step = 1; step <= 6; step++) {
    const action = page.locator(`${placard(n)} [id$="-drawer"] [class*=drawerAction]`).first();
    if (!(await action.count()) || (await action.getAttribute("aria-disabled")) === "true") break;
    const label = (await action.innerText()).trim();
    // Focus and Enter, as a keyboard visitor would. (A test click auto-scrolls the window to reach a button
    // inside a scrolled sheet, which walks the hall; a visitor's tap on the visible button doesn't.)
    const stop = await counter(page);
    await action.evaluate((el) => el.focus());
    await page.keyboard.press("Enter");
    await page.waitForTimeout(2700); // The longest step (the books' topple) runs 2.5 s.
    await check(`step ${step} (${label.toLowerCase()})`);
    if ((await counter(page)) !== stop) report(`drawer at stop ${n}: focus inside it walked the hall`, [`from "${stop}" to "${await counter(page)}"`]);
    // The end: the card is open (its button now closes it), or the books have toppled (the button now resets).
    const now = (await action.count()) ? (await action.innerText()).trim() : "";
    if (/close the card|make room/i.test(now)) break;
  }
}

/** Read exhibit: unfolds the details (stated by aria-expanded), keeps the case in view (phones), scrolls
 *  inside itself without walking the hall, and folds on Escape with focus back on the button. */
async function readDetails(page, n, name, title, small) {
  const read = page.locator(`${placard(n)} button[aria-controls$="-details"]`);
  const problems = [];
  if ((await read.count()) !== 1) return report(`${name}: ${title}, Read exhibit`, ["no Read exhibit button"]);
  if ((await read.getAttribute("aria-expanded")) !== "false") problems.push("starts expanded");
  const hidden = await page.evaluate((sel) => getComputedStyle(document.querySelector(`${sel} [id$="-details"]`)).display === "none", placard(n));
  if (!hidden) problems.push("details showing before Read exhibit");
  await read.focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1100);
  if ((await read.getAttribute("aria-expanded")) !== "true") problems.push("aria-expanded not true once open");
  const g = await scan(page, placard(n));
  problems.push(...fits(g), ...inPlace(g));
  if (small) problems.push(...exhibitShows(g, n, 0.75));
  const region = await page.evaluate((sel) => {
    const d = document.querySelector(`${sel} [id$="-details"]`);
    const card = document.querySelector(sel).getBoundingClientRect();
    const box = d.getBoundingClientRect();
    return { shown: getComputedStyle(d).display !== "none", inside: box.bottom <= card.bottom + 0.5 && box.top >= card.top - 0.5, scrolls: d.scrollHeight > d.clientHeight + 1 };
  }, placard(n));
  if (!region.shown) problems.push("details still hidden");
  if (!region.inside) problems.push("details run outside the placard");
  await shot(page, `${name}-${n}-read`);
  // Reading a long placard: the wheel over it scrolls the details, never the hall.
  const stop = await counter(page);
  const box = await page.locator(`${placard(n)} [id$="-details"]`).boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height / 2, 20));
    for (let k = 0; k < 6; k++) await page.mouse.wheel(0, 160);
    await page.waitForTimeout(1200);
    if ((await counter(page)) !== stop) problems.push(`scrolling the details walked the hall to "${await counter(page)}"`);
    if (region.scrolls && !(await page.evaluate((sel) => document.querySelector(`${sel} [id$="-details"]`).scrollTop > 0, placard(n)))) problems.push("the details didn't scroll");
  }
  // Escape from inside the details (a case-study link, if there is one) folds them and brings focus back.
  const inside = page.locator(`${placard(n)} [id$="-details"] a`).first();
  if (await inside.count()) await inside.focus();
  else await read.focus();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);
  const after = await page.evaluate((sel) => ({ expanded: document.querySelector(`${sel} button[aria-controls$="-details"]`).getAttribute("aria-expanded"), focus: document.activeElement?.getAttribute("aria-controls") ?? document.activeElement?.tagName }), placard(n));
  if (after.expanded !== "false") problems.push("Escape didn't fold the details");
  if (!/-details$/.test(after.focus)) problems.push(`focus went to ${after.focus} after Escape`);
  const folded = await scan(page, placard(n));
  if (small) problems.push(...exhibitClear(folded, n, 0.5).map((p) => `folded again: ${p}`));
  report(`${name}: ${title}, Read exhibit`, problems);
}

// Phones have no rail. Wide screens are checked with the guide remembered open and folded; on a short
// landscape screen a remembered "open" still shows the strip (the open guide overlays the hall there, see 7).
const runs = Object.entries(SIZES).flatMap(([size, options]) => (options.viewport.width < 640 ? [[size, options, null]] : [[size, options, "open"], [size, options, "folded"]]));

// ---------------------------------------------------------------- 1. every stop, every size
for (const [size, options, rail] of runs) {
  if (only && !only.includes(size)) continue;
  const name = rail ? `${size} guide ${rail}` : size;
  const context = await browser.newContext(options);
  const { page, errors } = await open(context, rail);
  const first = await counter(page);
  report(`${name}: opens at the current role`, /001 \/ 005/.test(first) ? [] : [`pager says "${first}"`]);
  const exhibits = await page.locator(`ol[aria-label] > li:has(${"article button[aria-controls$='-drawer']"})`).count();
  report(`${name}: finds the exhibits`, exhibits > 0 ? [] : ["no exhibit with a drawer found; has the markup changed?"], `${exhibits}`);
  for (let n = 1; n <= exhibits; n++) {
    let title = `exhibit ${n}`;
    try {
      if (n > 1) await next(page);
      await page.mouse.move(2, 2);
      title = await page.locator(`${placard(n)} h2`).innerText({ timeout: 5000 });
      const closed = await scan(page, placard(n));
      // On a phone the exhibit has its own band above the placard; nothing may cover it, before any drawer.
      const small = options.viewport.width < 640;
      // Short landscape: the placard beside the case, never over it.
      const clear = small ? exhibitClear(closed, n, 0.5) : options.viewport.height <= 500 ? exhibitClear(closed, n, 0.15) : [];
      report(`${name}: ${title}`, [...fits(closed), ...inPlace(closed), ...clear]);
      await shot(page, `${name}-${n}-label`);
      if (small || options.viewport.height <= 500) await readDetails(page, n, name, title, small);

      await openDrawer(page, n);
      const drawerChecks = async (when) => {
        const g = await scan(page, placard(n));
        report(`${name}: ${title}, drawer ${when}`, [...fits(g).map((p) => `placard ${p}`), ...discoveryClear(g, n), ...inPlace(g)]);
      };
      await drawerChecks("open");
      const problems = [];
      const backs = page.locator(placard(n)).getByRole("button", { name: /back to exhibit/i });
      if ((await backs.count()) !== 1) problems.push(`${await backs.count()} Back to exhibit buttons, not one`);
      if ((await page.locator(placard(n)).getByRole("button", { name: /close/i }).count()) > 0) problems.push("another close control in the placard");
      if (!(await page.evaluate((sel) => !!document.querySelector(sel)?.contains(document.activeElement) && !!document.activeElement.closest('[id$="-drawer"]'), placard(n)))) problems.push("focus did not move into the drawer");
      const back = await backs.first().boundingBox({ timeout: 5000 }).catch(() => null);
      const g = await scan(page, placard(n));
      // On screen and clear of the bottom bar (a placard beside a short landscape screen's pager may run
      // down past its top).
      const reach = back && { x: back.x, y: back.y, r: back.x + back.width, b: back.y + back.height };
      if (!reach || reach.y < 0 || reach.b > g.vh || g.bottom.some((c) => meets(reach, c))) problems.push("Back to exhibit is out of reach");
      // The placard's three parts: content above the footer (never under it), solid paper, and a filled
      // primary action wherever the drawer has one to take.
      const parts = await page.evaluate((sel) => {
        const card = document.querySelector(sel);
        const view = card.querySelector('[id$="-drawer"]');
        const foot = card.querySelector("[class*=drawerFooter]");
        const action = view.querySelector("[class*=drawerAction]:not([data-tone])");
        return {
          overlap: foot ? view.getBoundingClientRect().bottom - foot.getBoundingClientRect().top : null,
          inside: foot ? foot.getBoundingClientRect().bottom <= card.getBoundingClientRect().bottom + 0.5 : false,
          opacity: getComputedStyle(card).opacity,
          action: action && action.getAttribute("aria-disabled") !== "true" ? getComputedStyle(action).backgroundColor : "none",
        };
      }, placard(n));
      if (parts.overlap === null) problems.push("no footer");
      else if (parts.overlap > 0.5) problems.push(`content runs ${Math.round(parts.overlap)}px under the footer`);
      if (!parts.inside) problems.push("footer outside the card");
      if (parts.opacity !== "1") problems.push(`placard ${parts.opacity} opaque`);
      if (parts.action !== "none" && parts.action !== "rgb(31, 58, 51)") problems.push(`primary action not filled (${parts.action})`);
      report(`${name}: ${title}, drawer controls`, problems);
      await shot(page, `${name}-${n}-drawer`);
      await playDrawer(page, n, drawerChecks);
      await shot(page, `${name}-${n}-drawer-end`);

      // Escape closes the drawer and leaves focus on the placard's Open drawer button.
      await page.keyboard.press("Escape");
      await page.waitForTimeout(900);
      const after = await page.evaluate((sel) => ({
        open: !!document.querySelector(`${sel} [id$="-drawer"]:not([hidden])`),
        focus: `${document.activeElement?.getAttribute("aria-controls")} ${document.activeElement?.getAttribute("aria-expanded")}`,
      }), placard(n));
      const escape = [];
      if (after.open) escape.push("the drawer is still open");
      if (!/-drawer false$/.test(after.focus)) escape.push(`focus went to ${after.focus}, not the Open drawer button`);
      report(`${name}: ${title}, Escape`, escape);
    } catch (error) {
      // One broken stop is a failure to report, not a reason to lose the rest of the run.
      report(`${name}: ${title}`, [error.message.split("\n")[0]]);
      await page.keyboard.press("Escape").catch(() => {});
    }
  }
  // The desk, on small screens: the desktop and its bell in view, and its placard's Read more.
  if (options.viewport.width < 640 || options.viewport.height <= 500) {
    try {
      await next(page);
      await page.mouse.move(2, 2);
      const g = await scan(page, placard(7));
      const small = options.viewport.width < 640;
      report(`${name}: Information desk`, [...fits(g), ...inPlace(g), ...(small ? exhibitClear(g, 7, 0.5) : [])]);
      await shot(page, `${name}-7-label`);
      await readDetails(page, 7, name, "Information desk", small);
      // Back through every stop with Prev: each one's placard fits and (phones) its exhibit shows.
      const back = [];
      for (let n = 6; n >= 1; n--) {
        await prev(page);
        const at = await scan(page, placard(n));
        const problems = [...fits(at), ...inPlace(at), ...(small ? exhibitClear(at, n, 0.5) : exhibitClear(at, n, 0.15))];
        if (problems.length) back.push(`stop ${n}: ${problems.join(", ")}`);
      }
      report(`${name}: back to the start with Prev`, back, await counter(page));
      if (small) {
        // The phone's guide sheet, from the bar: on screen, its stop rows in their own type (serif titles,
        // left-aligned, not the bar's mono capitals), and Escape closes it back to its button.
        await page.locator("[aria-controls=guide-sheet]").click();
        await page.waitForFunction(() => !document.querySelector("#guide-sheet")?.hidden);
        const sheet = await page.evaluate(() => {
          const panel = document.querySelector("#guide-sheet");
          const row = panel.querySelector("button[aria-current]") ?? panel.querySelector("button");
          const title = row.querySelector("[class*=stopTitle]");
          const r = panel.getBoundingClientRect();
          return { transform: getComputedStyle(row).textTransform, align: getComputedStyle(row).textAlign, serif: /serif/i.test(getComputedStyle(title).fontFamily) && !/mono/i.test(getComputedStyle(title).fontFamily), top: r.top, bottom: r.bottom };
        });
        await shot(page, `${name}-guide-sheet`);
        await page.keyboard.press("Escape");
        await page.waitForFunction(() => document.querySelector("#guide-sheet")?.hidden);
        const back = await page.evaluate(() => document.activeElement?.getAttribute("aria-controls"));
        const s = [];
        if (sheet.transform !== "none" || sheet.align !== "left" || !sheet.serif) s.push(`stop rows styled ${JSON.stringify(sheet)}`);
        if (sheet.top < 0) s.push(`the sheet runs off the top (${Math.round(sheet.top)})`);
        if (back !== "guide-sheet") s.push(`Escape left focus on ${back}`);
        report(`${name}: the guide sheet`, s);
      }
      // The Fatherhood plinth between After Hours and the desk: somewhere on the walk there, its card shows in
      // full, clear of every visible placard, the header and the bar. The camera is parked at each tenth of
      // the way (the hall's own debug hook) and measured after it has drawn that frame.
      const sightings = [];
      for (let k = 1; k <= 9; k++) {
        const at = 5 + k / 10;
        await page.evaluate((at) => window.__museumApi.setTarget(at, true), at);
        await page.waitForFunction((at) => Math.abs((window.__hall?.progress ?? 0) - at) < 0.001, at, { timeout: 5000 });
        await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
        const seen = await page.evaluate(() => {
          const card = document.querySelector("[class*=plinthCard]");
          const b = card.getBoundingClientRect();
          const box = { x: b.left, y: b.top, r: b.right, b: b.bottom };
          const covered = [...document.querySelectorAll("ol[aria-label^='Exhibits'] article")]
            .filter((a) => Number(getComputedStyle(a).opacity) > 0.5)
            .some((a) => { const r = a.getBoundingClientRect(); return r.left < box.r && r.right > box.x && r.top < box.b && r.bottom > box.y; });
          return { opacity: Number(card.style.opacity || 0), box, covered };
        });
        const g = await scan(page);
        const under = [...g.header, ...g.bottom].some((c) => meets(seen.box, c));
        const onScreen = seen.box.x >= 0 && seen.box.r <= g.vw && seen.box.y >= 0 && seen.box.b <= g.vh;
        if (seen.opacity >= 0.9 && !seen.covered && !under && onScreen) sightings.push(at.toFixed(1));
        if (k === 5) await shot(page, `${name}-fatherhood`);
      }
      const p = sightings.length ? [] : ["never seen in full and uncovered between After Hours and the desk"];
      report(`${name}: the Fatherhood plinth on the way to the desk`, p, `clear at ${sightings.join(", ")}`);
    } catch (error) {
      report(`${name}: Information desk`, [error.message.split("\n")[0]]);
    }
  }
  report(`${name}: no page errors`, errors.map((e) => e.slice(0, 120)));
  await context.close();
}

if (!only) {
  // ---------------------------------------------------------------- 2. walking by scrolling
  for (const [size, rail] of [["1280x744", "open"], ["1280x744", "folded"], ["1440x900", "open"], ["390x844", null], ["667x375", "folded"], ["844x390", "open"]]) {
    const name = rail ? `${size} guide ${rail}` : size;
    const context = await browser.newContext(SIZES[size]);
    const { page, errors } = await open(context, rail);
    const { width, height } = SIZES[size].viewport;
    await page.mouse.move(width * 0.6, height * 0.45);
    const walk = async (label, dx, dy, ticks) => {
      for (let k = 0; k < ticks; k++) {
        await page.mouse.wheel(dx, dy);
        await page.waitForTimeout(35);
      }
      await page.waitForTimeout(1400);
      report(`${name}: scrolling ${label}`, inPlace(await scan(page)), await counter(page));
    };
    // Resting a little off a stop (the hall leaves you there on purpose): the placard is still solid paper.
    await page.evaluate(() => scrollBy(0, innerHeight * 0.08));
    await page.waitForTimeout(1500);
    const solid = await page.evaluate(() => getComputedStyle(document.querySelector("ol[aria-label] > li:nth-child(1) article")).opacity);
    report(`${name}: placard solid just off a stop`, solid === "1" ? [] : [`opacity ${solid}`]);
    await toStart(page);
    await walk("down (vertical wheel)", 0, 120, 40);
    await walk("up (vertical wheel)", 0, -120, 40);
    await walk("on (horizontal trackpad)", 90, 0, 60);
    await walk("back (horizontal trackpad)", -90, 0, 60);
    await walk("on (diagonal)", 70, 60, 50);
    await walk("back (diagonal)", -70, -60, 50);
    // The keyboard: right arrow to the desk, left arrow back, one stop per press.
    await toStart(page);
    await page.evaluate(() => document.activeElement?.blur());
    const keyed = [];
    for (let k = 1; k <= 6; k++) {
      const from = await stopNow(page);
      await page.keyboard.press("ArrowRight");
      await settle(page, from).catch(() => keyed.push(`right ${k}: never settled`));
      if ((await stopNow(page)) !== from + 1) keyed.push(`right ${k}: from stop ${from} to ${await stopNow(page)}, not one stop`);
    }
    if (!(await counter(page)).includes("DESK")) keyed.push(`right arrow ended at "${await counter(page)}"`);
    for (let k = 1; k <= 6; k++) {
      const from = await stopNow(page);
      await page.keyboard.press("ArrowLeft");
      await settle(page, from).catch(() => keyed.push(`left ${k}: never settled`));
      if ((await stopNow(page)) !== from - 1) keyed.push(`left ${k}: from stop ${from} to ${await stopNow(page)}, not one stop`);
    }
    if (!(await counter(page)).includes("001")) keyed.push(`left arrow ended at "${await counter(page)}"`);
    report(`${name}: walking by keyboard, to the desk and back`, [...keyed, ...inPlace(await scan(page))]);
    // The fling that used to drag the gallery off screen: focus in an open drawer, then a quick scroll on.
    for (const n of [1, 3]) {
      await toStart(page);
      for (let k = 1; k < n; k++) await next(page);
      await openDrawer(page, n);
      await page.mouse.move(width * 0.6, height * 0.45);
      for (let k = 0; k < 3; k++) await page.mouse.wheel(0, 420);
      await page.waitForTimeout(1800);
      const g = await scan(page);
      report(`${name}: fling on from an open drawer at stop ${n}`, inPlace(g), await counter(page));
      await shot(page, `${name}-fling-from-${n}`);
    }
    // Scrolling inside an open drawer's placard reads it; it doesn't walk the visitor away.
    await toStart(page);
    await openDrawer(page, 1);
    const box = await page.locator(placard(1)).boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    for (let k = 0; k < 8; k++) await page.mouse.wheel(0, 200);
    await page.waitForTimeout(1200);
    const stayed = (await counter(page)).includes("001");
    const stillOpen = await page.evaluate((sel) => !!document.querySelector(`${sel} [id$="-drawer"]:not([hidden])`), placard(1));
    report(`${name}: scrolling an open drawer's placard stays put`, stayed && stillOpen ? [] : [`now at "${await counter(page)}", drawer ${stillOpen ? "open" : "shut"}`]);
    report(`${name}: no page errors while scrolling`, errors.map((e) => e.slice(0, 120)));
    await context.close();
  }

  // ---------------------------------------------------------------- 3. folding the guide at first, middle and last stops
  for (const size of ["1280x744", "1440x900"]) {
    const context = await browser.newContext(SIZES[size]);
    const { page } = await open(context, "open");
    let at = 1;
    for (const [n, where] of [[1, "first"], [3, "middle"], [6, "last case"], [7, "desk"]]) {
      while (at < n) {
        await next(page);
        at++;
      }
      const drawer = n <= 6;
      if (drawer) await openDrawer(page, n);
      for (const state of ["folded", "open"]) {
        await page.locator("[aria-controls=field-guide]").click();
        await page.waitForTimeout(900);
        const g = await scan(page, placard(n));
        report(`${size}: guide ${state} at the ${where} stop${drawer ? ", drawer open" : ""}`, [...fits(g), ...(drawer ? discoveryClear(g, n) : []), ...inPlace(g)]);
        await shot(page, `${size}-fold-${where}-${state}${drawer ? "-drawer" : ""}`);
      }
      if (drawer) {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(800);
      }
    }
    await context.close();
  }

  // ---------------------------------------------------------------- 4. resizing after load
  {
    const context = await browser.newContext(SIZES["1440x900"]);
    const { page, errors } = await open(context, null);
    await next(page);
    await openDrawer(page, 2);
    for (const size of ["1280x744", "1280x600", "390x844", "375x667", "1366x768"]) {
      await page.setViewportSize(SIZES[size].viewport);
      await page.waitForTimeout(1500);
      const g = await scan(page, placard(2));
      const stillOpen = await page.evaluate((sel) => !!document.querySelector(`${sel} [id$="-drawer"]:not([hidden])`), placard(2));
      const at = await counter(page);
      report(`resized to ${size}, drawer ${stillOpen ? "open" : "shut"}`, [...fits(g), ...(stillOpen ? discoveryClear(g, 2) : []), ...inPlace(g), ...(at.includes("002") ? [] : [`now at "${at}", not stop 002`])]);
      await shot(page, `resized-${size}`);
    }
    report("no page errors while resizing", errors.map((e) => e.slice(0, 120)));
    await context.close();
  }
  {
    // A phone turned on its side and back, and the 640px breakpoint crossed both ways, guide folded (the
    // default under 900px): the stop is kept, and the placard and an open drawer fit each time.
    const context = await browser.newContext(SIZES["390x844"]);
    const { page, errors } = await open(context, "folded");
    await next(page);
    await next(page);
    await openDrawer(page, 3);
    for (const size of ["844x390", "390x844", "667x375", "375x667", "639x800", "640x800", "639x800", "390x844"]) {
      const [width, height] = size.split("x").map(Number);
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(1500);
      const g = await scan(page, placard(3));
      const stillOpen = await page.evaluate((sel) => !!document.querySelector(`${sel} [id$="-drawer"]:not([hidden])`), placard(3));
      const at = await counter(page);
      report(`turned to ${size}, drawer ${stillOpen ? "open" : "shut"}`, [...fits(g), ...(stillOpen ? discoveryClear(g, 3) : []), ...inPlace(g), ...(at.includes("003") ? [] : [`now at "${at}", not stop 003`])]);
      await shot(page, `turned-${size}`);
    }
    report("no page errors while turning", errors.map((e) => e.slice(0, 120)));
    await context.close();
  }

  // ---------------------------------------------------------------- 7. the guide as an overlay
  for (const [size, rail] of [["844x390", "open"], ["667x375", "folded"], ["900x700", "open"], ["999x800", "open"], ["1000x800", "open"]]) {
    const [width, height] = size.split("x").map(Number);
    const options = SIZES[size] ?? { viewport: { width, height } };
    const context = await browser.newContext(options);
    const { page, errors } = await open(context, rail);
    const name = `${size} guide remembered ${rail}`;
    const guide = () =>
      page.evaluate(() => ({
        mode: document.querySelector("[data-guide]")?.dataset.guide,
        width: document.querySelector("#field-guide").getBoundingClientRect().width,
        scrim: !!document.querySelector("[class*=scrim]"),
        expanded: document.querySelector("[aria-controls=field-guide]").getAttribute("aria-expanded"),
        y: scrollY,
      }));
    const closed = await guide();
    if (width >= 1000 && height > 500) {
      // Room enough: the docked rail, as before.
      report(`${name}: the docked rail, not an overlay`, closed.mode === "open" && Math.round(closed.width) === 340 && !closed.scrim ? [] : [JSON.stringify(closed)]);
      await context.close();
      continue;
    }
    // Closed: the strip, whatever was remembered, and the hall at its full width beside it.
    report(`${name}: closed, the strip`, closed.mode === "overlay" && Math.round(closed.width) === 72 && closed.expanded === "false" ? [] : [JSON.stringify(closed)]);
    await next(page);
    await next(page);
    // With a drawer open and (where compact) the details read: the overlay keeps both.
    await openDrawer(page, 3);
    const opener = page.getByRole("button", { name: "Open the field guide" });
    await opener.focus();
    await page.keyboard.press("Enter");
    const mode = (want) => page.waitForFunction((want) => document.querySelector("[data-guide]")?.dataset.guide === want, want, { timeout: 3000 });
    // Open: the panel at its full width (its width eases), the scrim up, focus inside.
    await mode("overlay-open");
    await page.waitForFunction(() => document.querySelector("#field-guide").getBoundingClientRect().width >= 300 && !!document.activeElement?.closest("#field-guide"), null, { timeout: 3000 }).catch(() => {});
    const opened = await guide();
    const problems = [];
    if (Math.round(opened.width) < 300 || !opened.scrim || opened.expanded !== "true") problems.push(`not open as an overlay: ${JSON.stringify(opened)}`);
    if (!(await page.evaluate(() => document.activeElement?.getAttribute("aria-current") === "location"))) problems.push("focus didn't start on the stop you're at");
    if (!(await page.evaluate(() => document.querySelector("header").inert && document.querySelector("ol[aria-label^='Exhibits']").inert && document.querySelector("canvas").inert && document.querySelector("[class*=controls]").inert))) problems.push("the hall behind isn't inert");
    // The handle (its close control) on screen; the list scrolls inside the panel.
    const handle = await page.locator("[aria-controls=field-guide]").boundingBox();
    if (!handle || handle.y < 0 || handle.y + handle.height > height || handle.x + handle.width > width) problems.push("the close control is off screen");
    const list = await page.evaluate(() => {
      const panel = [...document.querySelectorAll("#field-guide > div")].find((d) => d.getClientRects().length);
      return { scrolls: panel.scrollHeight > panel.clientHeight + 1, overflow: getComputedStyle(panel).overflowY };
    });
    if (list.scrolls && list.overflow !== "auto") problems.push("the guide's list overflows without scrolling");
    report(`${name}: opens over the hall`, problems);
    await shot(page, `${name}-overlay-open`);
    // Containment: Tab and Shift+Tab never leave the guide; wheel and keys don't move the hall. Both ends of
    // the trap: Shift+Tab from the first control lands on the last (the handle), Tab from there on the first.
    const ends = await page.evaluate(() => {
      const panel = [...document.querySelectorAll("#field-guide > div")].find((d) => d.getClientRects().length);
      const first = panel.querySelector("a[href], button:not(:disabled)");
      first.focus();
      return first.textContent.trim().slice(0, 20);
    });
    await page.keyboard.press("Shift+Tab");
    const wrapBack = await page.evaluate(() => document.activeElement?.getAttribute("aria-controls"));
    await page.keyboard.press("Tab");
    const wrapOn = await page.evaluate(() => document.activeElement?.textContent.trim().slice(0, 20));
    const out = [];
    if (wrapBack !== "field-guide") out.push(`Shift+Tab from the first control went to ${wrapBack}`);
    if (wrapOn !== ends) out.push(`Tab from the handle went to "${wrapOn}", not "${ends}"`);
    for (let k = 0; k < 30; k++) {
      await page.keyboard.press(k % 5 === 4 ? "Shift+Tab" : "Tab");
      const inside = await page.evaluate(() => !!document.activeElement?.closest("#field-guide, [aria-controls=field-guide]"));
      if (!inside) out.push(await page.evaluate(() => `${document.activeElement?.tagName} ${document.activeElement?.textContent?.slice(0, 20)}`));
    }
    await page.mouse.move(width - 30, height / 2);
    for (let k = 0; k < 6; k++) await page.mouse.wheel(0, 300);
    for (let k = 0; k < 4; k++) await page.mouse.wheel(300, 0);
    // Keys that walk or scroll the hall, from the stop you're at in the guide (not Space or Enter: on a stop
    // those choose it, which is meant to close the guide and walk).
    await page.evaluate(() => [...document.querySelectorAll('#field-guide [aria-current="location"]')].find((b) => b.getClientRects().length)?.focus());
    for (const key of ["ArrowRight", "ArrowLeft", "ArrowDown", "PageDown", "End"]) await page.keyboard.press(key);
    await page.waitForTimeout(900);
    const held = await guide();
    report(`${name}: focus stays in the guide, the hall stays put`, [
      ...out.map((o) => (/^(Shift\+)?Tab /.test(o) ? o : `focus left to ${o}`)),
      ...(held.y !== opened.y ? [`the hall moved (${opened.y} to ${held.y})`] : []),
      ...((await counter(page)).includes("003") ? [] : [`now at "${await counter(page)}"`]),
    ]);
    // Escape: closed, focus back on the Guide button, the stop, drawer and scroll position as they were.
    await page.keyboard.press("Escape");
    // Closed and settled: the strip back at its width (it eases), focus somewhere real.
    await mode("overlay").catch(() => {});
    await page.waitForFunction(() => document.querySelector("#field-guide").getBoundingClientRect().width <= 72.5 && document.activeElement && document.activeElement !== document.body, null, { timeout: 3000 }).catch(() => {});
    const after = await guide();
    const kept = await page.evaluate((sel) => ({
      drawer: !!document.querySelector(`${sel} [id$="-drawer"]:not([hidden])`),
      focus: document.activeElement?.getAttribute("aria-label") ?? (document.activeElement?.getAttribute("aria-controls") === "field-guide" ? "the handle" : document.activeElement?.tagName),
    }), placard(3));
    const escape = [];
    if (after.mode !== "overlay" || after.scrim) escape.push(`still open: ${JSON.stringify(after)}`);
    // Back to what opened it, or the handle (the close control) if that's where focus was.
    if (kept.focus !== "Open the field guide" && kept.focus !== "the handle") escape.push(`focus went to ${kept.focus}`);
    if (!kept.drawer) escape.push("the drawer shut");
    if (after.y !== opened.y) escape.push(`the hall moved (${opened.y} to ${after.y})`);
    if (!(await counter(page)).includes("003")) escape.push(`now at "${await counter(page)}"`);
    const g = await scan(page, placard(3));
    escape.push(...fits(g), ...discoveryClear(g, 3), ...inPlace(g));
    report(`${name}: Escape closes it, everything as it was`, escape);
    await page.keyboard.press("Escape"); // The drawer.
    await page.waitForTimeout(800);
    // Compact sizes: the details unfolded survive the overlay too.
    if (height <= 500) {
      const read = page.locator(`${placard(3)} button[aria-controls$="-details"]`);
      await read.click();
      await page.waitForFunction((sel) => document.querySelector(sel)?.getAttribute("aria-expanded") === "true", `${placard(3)} button[aria-controls$="-details"]`);
      await page.locator("[aria-controls=field-guide]").click();
      await mode("overlay-open");
      await page.locator("[class*=scrim]").click({ position: { x: width - 40, y: height / 2 } });
      await mode("overlay").catch(() => {});
      const still = await read.getAttribute("aria-expanded");
      const closedByScrim = (await guide()).mode === "overlay";
      report(`${name}: the scrim closes it, details still unfolded`, still === "true" && closedByScrim ? [] : [`details ${still}, guide ${(await guide()).mode}`]);
      await read.click();
      await page.waitForTimeout(500);
    }
    // Choosing a stop in the overlay closes it and walks there.
    await opener.click();
    await mode("overlay-open");
    const from = await stopNow(page);
    await page.locator("#field-guide").getByRole("button", { name: /^AH|After Hours/ }).first().click();
    await settle(page, from);
    const chosen = await guide();
    const landed = await page.evaluate(() => document.activeElement?.getAttribute("aria-controls"));
    report(`${name}: choosing a stop closes it and walks there`, chosen.mode === "overlay" && (await counter(page)).includes("AH") && landed === "field-guide" ? [] : [`guide ${chosen.mode}, at "${await counter(page)}", focus on ${landed}`]);
    // Opened from a placard (focus there, then the [ key) and closed by choosing a stop: the hall stays at
    // the chosen stop (focusing that placard again would walk back to it).
    await page.locator(placard(6)).focus();
    await page.keyboard.press("[");
    await mode("overlay-open");
    const from2 = await stopNow(page);
    await page.locator("#field-guide").getByRole("button", { name: /Information desk/ }).first().click();
    await settle(page, from2);
    await page.waitForTimeout(400); // Long enough for a stray walk back to begin, which settle would then miss.
    report(`${name}: opened from a placard, a stop chosen, no walk back`, (await counter(page)).includes("DESK") ? [] : [`now at "${await counter(page)}"`]);
    const here = await stopNow(page);
    const hereName = await counter(page);
    // Turning or resizing with it open: each size's own form, and the overlay never left open by itself.
    await opener.click();
    await mode("overlay-open");
    const turns = [];
    for (const [w, h, want] of [[390, 844, "sheet"], [width, height, "overlay"], [1280, 744, null], [width, height, "overlay"]]) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(1200);
      const now = await guide();
      if (want && now.mode !== want) turns.push(`at ${w}x${h} the guide is "${now.mode}", not "${want}"`);
      if (!want && now.mode === "overlay-open") turns.push(`at ${w}x${h} the overlay stayed open`);
      if (now.scrim && now.mode !== "overlay-open") turns.push(`at ${w}x${h} a scrim with no overlay`);
      if ((await counter(page)) !== hereName) turns.push(`at ${w}x${h} now at "${await counter(page)}", not "${hereName}"`);
      const at = await scan(page, placard(here + 1));
      turns.push(...fits(at).map((p) => `${w}x${h}: ${p}`), ...inPlace(at).map((p) => `${w}x${h}: ${p}`));
    }
    report(`${name}: turned and resized with it open`, turns);
    report(`${name}: no page errors`, errors.map((e) => e.slice(0, 120)));
    await context.close();
  }

  // ---------------------------------------------------------------- 8. a drawer opening and closing
  // The placard eases between its closed and open places and sizes instead of jumping, lands exactly where
  // it did before, and nothing is left half-way: after a quick open and close, walking away mid-ease, or a
  // resize mid-ease. Sampled on every frame in the page.
  for (const [size, turnTo] of [["1280x744", "1000x700"], ["390x844", "844x390"], ["844x390", "390x844"]]) {
    const context = await browser.newContext(SIZES[size]);
    const { page, errors } = await open(context, size === "1280x744" ? "folded" : null);
    const name = `drawer ease, ${size}`;
    /** Every frame's box of stop n's placard for `ms`, from just before `act` runs. */
    const sample = async (n, ms, act) => {
      await page.evaluate(
        ({ sel, ms }) => {
          const el = document.querySelector(sel);
          const log = (window.__ease = []);
          const t0 = performance.now();
          const frame = () => {
            const r = el.getBoundingClientRect();
            log.push({ t: performance.now() - t0, x: r.left, y: r.top, h: r.height, b: r.bottom, morph: el.hasAttribute("data-morph") });
            if (performance.now() - t0 < ms) requestAnimationFrame(frame);
          };
          requestAnimationFrame(frame);
        },
        { sel: placard(n), ms },
      );
      await act();
      await page.waitForTimeout(ms + 100);
      return page.evaluate(() => window.__ease);
    };
    /** The change is spread over frames: most of it isn't in any one frame, and it takes a while. */
    const eased = (log, what) => {
      const problems0 = [];
      const keys = ["x", "y", "h", "b"];
      if (log.length < 2) return [`${what}: no frames sampled`];
      if (!log.some((e) => e.morph)) problems0.push(`${what}: the placard was never marked easing`);
      const total = Math.max(...keys.map((k) => Math.abs(log[log.length - 1][k] - log[0][k])));
      if (total < 4) return [...problems0, `${what}: the placard didn't move or resize (${total.toFixed(0)}px)`];
      let most = 0;
      const changed = [];
      for (let k = 1; k < log.length; k++) {
        const d = Math.max(...keys.map((key) => Math.abs(log[k][key] - log[k - 1][key])));
        most = Math.max(most, d);
        if (d > 0.5) changed.push(log[k].t);
      }
      const span = changed.length ? changed[changed.length - 1] - changed[0] : 0;
      const problems = problems0;
      if (most > total * 0.5) problems.push(`${what}: ${most.toFixed(0)}px of ${total.toFixed(0)}px in one frame`);
      if (span < 150) problems.push(`${what}: over in ${span.toFixed(0)}ms`);
      return problems;
    };
    /** Nothing left mid-ease: no placard with a set height, or marked easing, or content still faded. */
    const finished = () =>
      page.evaluate(() =>
        [...document.querySelectorAll("ol[aria-label] article")].flatMap((el, i) => [
          ...(el.hasAttribute("data-morph") ? [`placard ${i + 1} still marked easing`] : []),
          ...(el.style.height ? [`placard ${i + 1} kept a set height (${el.style.height})`] : []),
          ...[...el.querySelectorAll("*")].filter((c) => c.getClientRects().length && Number(getComputedStyle(c).opacity) < 0.99).map(() => `placard ${i + 1} has faded content`).slice(0, 1),
        ]),
      );
    const box = (n) => page.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.left, y: r.top, h: r.height }; }, placard(n));
    const same = (a, b, what) => (Math.abs(a.x - b.x) > 1 || Math.abs(a.y - b.y) > 1 || Math.abs(a.h - b.h) > 1 ? [`${what}: at ${a.x.toFixed(0)},${a.y.toFixed(0)} ${a.h.toFixed(0)}h, not ${b.x.toFixed(0)},${b.y.toFixed(0)} ${b.h.toFixed(0)}h`] : []);
    const back = (n) => page.locator(placard(n)).getByRole("button", { name: /Back to exhibit/ });

    // Stop 1 (a long drawer: the stamp and its note) and stop 5 (a short one: the tooth).
    for (const n of [1, 5]) {
      await toStart(page);
      for (let k = 1; k < n; k++) await next(page);
      await page.waitForTimeout(400);
      const closed = await box(n);
      const opening = await sample(n, 700, async () => {
        await page.locator(openButton(n)).focus();
        await page.keyboard.press("Enter");
      });
      await page.waitForTimeout(1200);
      const g = await scan(page, placard(n));
      const focus = await page.evaluate((sel) => !!document.activeElement?.closest(`${sel} [id$="-drawer"]`), placard(n));
      report(`${name}: stop ${n} opens smoothly, ending where it did`, [...eased(opening, "open"), ...fits(g), ...discoveryClear(g, n), ...inPlace(g), ...(focus ? [] : ["focus isn't in the drawer"]), ...(await finished())]);
      const closing = await sample(n, 700, () => back(n).press("Enter"));
      await page.waitForTimeout(800);
      const focusBack = await page.evaluate((sel) => document.activeElement?.matches(`${sel} button[aria-controls$="-drawer"]`), placard(n));
      report(`${name}: stop ${n} closes smoothly, back where it was`, [...eased(closing, "close"), ...same(await box(n), closed, "closed"), ...(focusBack ? [] : ["focus isn't back on Open drawer"]), ...(await finished())]);
    }

    // Open and straight back: lands closed, where it was, nothing stranded.
    await toStart(page);
    await page.waitForTimeout(400);
    const closed = await box(1);
    await page.locator(openButton(1)).focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(80);
    await back(1).press("Enter");
    await page.waitForTimeout(80);
    await page.locator(openButton(1)).press("Enter");
    await page.waitForTimeout(80);
    await back(1).press("Enter");
    await page.waitForTimeout(1200);
    report(`${name}: open, close, open, close in quick succession`, [...same(await box(1), closed, "after"), ...(await finished())]);

    // Walking on mid-ease: the drawer shuts, and the next stop's placard is placed as usual.
    const easingNow = () => page.evaluate((sel) => { const el = document.querySelector(sel); return el.hasAttribute("data-drawer") && el.hasAttribute("data-morph"); }, placard(1));
    await page.locator(openButton(1)).focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(80);
    const easingAtWalk = await easingNow();
    await page.locator("[class*=controls]").getByRole("button", { name: /^Next/ }).click({ timeout: 5000 });
    await settle(page, 0);
    await page.waitForTimeout(400);
    const walked = await scan(page, placard(2));
    const shut = await page.evaluate(() => !document.querySelector("article[data-drawer]"));
    report(`${name}: walking on mid-ease`, [...fits(walked), ...inPlace(walked), ...(easingAtWalk ? [] : ["wasn't mid-ease with the drawer open when walking on"]), ...(shut ? [] : ["a drawer is still open"]), ...(await finished())]);

    // A resize (or a turn) mid-ease: lands at once in the new size's place, drawer still open.
    await prev(page);
    await page.waitForTimeout(300);
    await page.locator(openButton(1)).focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(80);
    const easingAtTurn = await easingNow();
    const [w, h] = turnTo.split("x").map(Number);
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(1800);
    const turned = await scan(page, placard(1));
    await shot(page, `${name} resized mid-ease to ${turnTo}`);
    report(`${name}: resized to ${turnTo} mid-ease`, [...(easingAtTurn ? [] : ["wasn't mid-ease with the drawer open when resized"]), ...fits(turned), ...discoveryClear(turned, 1), ...inPlace(turned), ...(await finished())]);
    report(`${name}: no page errors`, errors.map((e) => e.slice(0, 120)));
    await context.close();
  }
  // Reduced motion: the final place and size at once, never easing.
  {
    const context = await browser.newContext({ ...SIZES["1280x744"], reducedMotion: "reduce" });
    const { page } = await open(context, "folded");
    const marked = await page.evaluate(
      (sel) =>
        new Promise((resolve) => {
          const el = document.querySelector(sel);
          let seen = false;
          const watch = new MutationObserver(() => (seen ||= el.hasAttribute("data-morph") || !!el.style.height));
          watch.observe(el, { attributes: true, attributeFilter: ["data-morph", "style"] });
          el.querySelector('button[aria-controls$="-drawer"]').click();
          setTimeout(() => {
            watch.disconnect();
            resolve(seen);
          }, 600);
        }),
      placard(1),
    );
    const g = await scan(page, placard(1));
    report("reduced motion: a drawer opens with no ease", [...(marked ? ["the placard eased (data-morph or a set height)"] : []), ...fits(g), ...discoveryClear(g, 1)]);
    await context.close();
  }

  // ---------------------------------------------------------------- 5. reduced motion, and no WebGL
  {
    const context = await browser.newContext({ ...SIZES["1280x744"], reducedMotion: "reduce" });
    const { page } = await open(context, "open");
    await openDrawer(page, 1);
    await page.locator("[aria-controls=field-guide]").click();
    await page.waitForTimeout(150); // No easing: already there.
    const g = await scan(page, placard(1));
    report("reduced motion: fold with a drawer open lands at once", [...fits(g), ...discoveryClear(g, 1), ...inPlace(g)]);
    await context.close();
  }
  {
    const plain = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ["--disable-webgl", "--disable-3d-apis"] } : { channel: "chrome", args: ["--disable-webgl", "--disable-3d-apis"] });
    const page = await (await plain.newContext(SIZES["1280x744"])).newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${base}/`);
    await page.waitForTimeout(2500);
    const state = await page.evaluate(() => ({ canvas: !!document.querySelector("canvas"), placards: document.querySelectorAll("ol[aria-label] article").length }));
    report("without WebGL: every placard as a page, no 3D", !state.canvas && state.placards === 7 && !errors.length ? [] : [JSON.stringify({ ...state, errors })]);
    // On a phone too: every placard's whole text showing, nothing folded behind a Read exhibit button.
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    const phone = await page.evaluate(() => ({
      toggles: document.querySelectorAll('button[aria-controls$="-details"]').length,
      hidden: [...document.querySelectorAll('[id$="-details"]')].filter((d) => getComputedStyle(d).display === "none").length,
    }));
    report("without WebGL, phone: full placards, no Read exhibit", phone.toggles === 0 && phone.hidden === 0 ? [] : [JSON.stringify(phone)]);
    await plain.close();
  }
}

await browser.close();
local?.close();
console.log(`\n${total - failed}/${total} passed. Screenshots: ${path.relative(root, shots)}/`);
process.exit(failed ? 1 : 0);
