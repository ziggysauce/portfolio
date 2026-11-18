// Layout regression check for the museum hall, in a real browser with WebGL.
//
// At each screen size (on a wide screen, with the field guide open and folded) it visits every exhibit,
// with its drawer closed and open, and fails if a placard or drawer card is clipped by the screen, runs
// into the title block or navigation, the field guide or its handle, or the pager or phone guide handle,
// or (on desktop) if an open drawer card covers its placard. It checks the drawer has one reachable close
// control (the placard's button; on a phone, where the card covers the placard, the card's own), that on
// a phone the card takes the placard's place and focus, and that Escape closes it and leaves focus on the
// placard's button.
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

// The box under test, every header piece and the bottom controls, in viewport pixels.
const probe = (page, selector) =>
  page.evaluate((selector) => {
    const edges = (el) => {
      const b = el.getBoundingClientRect();
      return { x: b.left, y: b.top, r: b.right, b: b.bottom, w: b.width };
    };
    const el = document.querySelector(selector);
    return {
      box: el ? edges(el) : null,
      header: [...document.querySelectorAll("header > div > *, header > nav")].map(edges).filter((e) => e.w > 0),
      guide: [...document.querySelectorAll("#field-guide, [aria-controls=field-guide]")].map(edges).filter((e) => e.w > 0),
      bottom: [...document.querySelectorAll("[class*=sheetHandle], [class*=controls]")].map(edges).filter((e) => e.w > 0),
      vw: innerWidth,
      vh: innerHeight,
    };
  }, selector);
const meets = (a, c) => a.x < c.r - 1 && a.r > c.x + 1 && a.y < c.b - 1 && a.b > c.y + 1;
const fits = (g) => {
  if (!g.box) return ["not found"];
  const problems = [];
  // Nothing to collide with would make every check pass: the selectors must still find the page's parts.
  if (g.header.length < 1) problems.push("found no header pieces; has the navigation changed?");
  if (g.bottom.length < 1) problems.push("found no pager; has it changed?");
  const { box } = g;
  if (box.y < -0.5 || box.b > g.vh + 0.5 || box.x < -0.5 || box.r > g.vw + 0.5) problems.push(`clipped by the screen (${Math.round(box.x)},${Math.round(box.y)} to ${Math.round(box.r)},${Math.round(box.b)})`);
  for (const h of g.header) if (meets(box, h)) problems.push(`runs into the header (piece at ${Math.round(h.x)},${Math.round(h.y)} to ${Math.round(h.r)},${Math.round(h.b)})`);
  for (const c of g.bottom) if (meets(box, c)) problems.push(`runs into the pager or guide handle (top ${Math.round(c.y)})`);
  for (const r of g.guide) if (meets(box, r)) problems.push(`runs into the field guide (its right edge at ${Math.round(r.r)})`);
  return problems;
};

const ready = (page) =>
  page.waitForFunction(() => document.querySelector("canvas") && !document.querySelector("[role=status]")?.textContent?.includes("Turning on the lights"), null, { timeout: 45000 });
const counter = (page) => page.locator("[class*=counter][aria-live=polite]").innerText().then((t) => t.replace(/\s+/g, " ").trim());

const runs = Object.entries(SIZES).flatMap(([size, options]) => (options.viewport.width < 640 ? [[size, options, null]] : [[size, options, "open"], [size, options, "folded"]]));
for (const [size, options, rail] of runs) {
  if (only && !only.includes(size)) continue;
  const portrait = options.viewport.width / options.viewport.height < 0.8;
  const phone = options.viewport.width < 640;
  const name = rail ? `${size} guide ${rail}` : size;
  const context = await browser.newContext(options);
  // The field guide's remembered state, as a returning visitor would have it.
  if (rail) await context.addInitScript((state) => localStorage.setItem("museum-guide", state), rail);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}/`);
  await ready(page);
  await page.waitForTimeout(2600);
  const first = await counter(page);
  report(`${name}: opens at the current role`, /001 \/ 005/.test(first) ? [] : [`pager says "${first}"`]);
  // The exhibits with a drawer (the stops before the Information desk).
  const exhibits = await page.locator(`ol[aria-label] > li:has(article button[aria-controls$="-drawer"])`).count();
  report(`${name}: finds the exhibits`, exhibits > 0 ? [] : ["no exhibit with a drawer found; has the markup changed?"], `${exhibits}`);

  let at = first;
  for (let n = 1; n <= exhibits; n++) {
    const label = `ol[aria-label] > li:nth-child(${n}) article`;
    let title = `exhibit ${n}`;
    try {
      if (n > 1) {
        await page.locator("[class*=controls]").getByRole("button", { name: /^Next/ }).click({ timeout: 5000 });
        await page.waitForTimeout(1800);
        const now = await counter(page);
        if (now === at) throw new Error(`the walk didn't move on from "${now}"`);
        at = now;
      }
      await page.mouse.move(2, 2);
      title = await page.locator(`${label} h2`).innerText({ timeout: 5000 });
      report(`${name}: ${title}, label`, fits(await probe(page, label)));
      await page.screenshot({ path: path.join(shots, `${name.replace(/ /g, "-")}-${n}-label.png`) });

      await page.locator(`ol[aria-label] > li:nth-child(${n}) article button[aria-controls$="-drawer"]`).focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(1900);
      const note = 'aside[id$="-drawer"]:not([hidden])';
      const g = await probe(page, note);
      const problems = fits(g);
      // One close control: the placard's button, or on a phone (where the card covers the placard) the card's.
      const closers = page.locator(phone ? note : `ol[aria-label] > li:nth-child(${n}) article`).getByRole("button", { name: /^close drawer/i });
      if ((await closers.count()) !== 1) problems.push(`${await closers.count()} close controls, not one`);
      if (!phone && (await page.locator(note).getByRole("button", { name: /close/i }).count())) problems.push("the drawer card has its own close control");
      const close = await closers.first().boundingBox({ timeout: 5000 }).catch(() => null);
      const top = g.bottom.length ? Math.min(...g.bottom.map((c) => c.y)) : -Infinity;
      if (!close || close.y < 0 || close.y + close.height > top + 1) problems.push("its close button is out of reach");
      const labelOpacity = await page.locator(label).evaluate((a) => getComputedStyle(a).opacity);
      if (portrait) {
        // The note takes the label's place, and focus goes into it.
        if (labelOpacity !== "0") problems.push("the label still shows around the note");
        if (!(await page.evaluate(() => !!document.activeElement?.closest("aside")))) problems.push("focus did not move into the note");
      } else {
        // The label stays up beside the note: both must fit, and the note must not cover it.
        const l = await probe(page, label);
        problems.push(...fits(l).map((p) => `label ${p}`));
        if (g.box && l.box && meets(g.box, l.box)) problems.push("the note covers the label");
      }
      report(`${name}: ${title}, drawer open`, problems);
      await page.screenshot({ path: path.join(shots, `${name.replace(/ /g, "-")}-${n}-drawer.png`) });

      // Escape closes the note and leaves focus on the drawer button (on a phone, focus was in the note).
      await page.keyboard.press("Escape");
      await page.waitForTimeout(800);
      const after = await page.evaluate(() => ({
        open: !!document.querySelector('aside[id$="-drawer"]:not([hidden])'),
        focus: document.activeElement?.getAttribute("aria-controls") ?? document.activeElement?.tagName,
      }));
      const escape = [];
      if (after.open) escape.push("the note is still open");
      if (!after.focus?.endsWith("-drawer")) escape.push(`focus went to ${after.focus}, not the drawer button`);
      report(`${name}: ${title}, Escape`, escape);
    } catch (error) {
      // One broken stop is a failure to report, not a reason to lose the rest of the run.
      report(`${name}: ${title}`, [error.message.split("\n")[0]]);
      await page.keyboard.press("Escape").catch(() => {});
    }
  }
  report(`${name}: no page errors`, errors.map((e) => e.slice(0, 120)));
  await context.close();
}

await browser.close();
local?.close();
console.log(`\n${total - failed}/${total} passed. Screenshots: ${path.relative(root, shots)}/`);
process.exit(failed ? 1 : 0);
