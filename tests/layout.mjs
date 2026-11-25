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
async function next(page) {
  const before = await counter(page);
  await page.locator("[class*=controls]").getByRole("button", { name: /^Next/ }).click({ timeout: 5000 });
  await page.waitForTimeout(1800);
  const now = await counter(page);
  if (now === before) throw new Error(`the walk didn't move on from "${now}"`);
}
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

// Phones have no rail. Short landscape screens start with it folded (under 900px wide) and are checked that
// way: the open rail (340px) leaves them no room for a placard, which is a known, separate problem.
const runs = Object.entries(SIZES).flatMap(([size, options]) =>
  options.viewport.width < 640 ? [[size, options, null]] : options.viewport.height <= 500 ? [[size, options, "folded"]] : [[size, options, "open"], [size, options, "folded"]],
);

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
    } catch (error) {
      report(`${name}: Information desk`, [error.message.split("\n")[0]]);
    }
  }
  report(`${name}: no page errors`, errors.map((e) => e.slice(0, 120)));
  await context.close();
}

if (!only) {
  // ---------------------------------------------------------------- 2. walking by scrolling
  for (const [size, rail] of [["1280x744", "open"], ["1280x744", "folded"], ["1440x900", "open"], ["390x844", null]]) {
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
