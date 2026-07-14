// FASE SEGNALE-FINAL-01 — strumento di pacing cumulativo.
// Campiona la pagina intera a passi fissi di scroll, misura la geometria reale
// e calcola il delta visivo fra frame consecutivi (RMSE via ImageMagick).
// I plateau sono corse lunghe di delta ~0: scroll speso senza cambiamento.

import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const RUN = path.resolve("../runs/2026-07-10-marketing-strategy-generator");
const OUT = path.join(RUN, "screenshots/segnale-full-page-final-review");
const FRAMES = path.join(OUT, "performance/frames");

const VIEWPORTS = [
  { name: "desktop-1440x1000", width: 1440, height: 1000, step: 125 },
  { name: "mobile-390x844", width: 390, height: 844, step: 105 },
];

const SECTIONS = [
  ["hero", ".hero-live, .live-stage, [data-hero]"],
  ["s01", "#section-01-come-funziona"],
  ["s02", "#section-02-esempio-di-piano"],
  ["s03", "#section-03-cosa-ricevi"],
  ["s04", "#section-04-cta-finale"],
];

rmSync(FRAMES, { recursive: true, force: true });
mkdirSync(FRAMES, { recursive: true });
mkdirSync(path.join(OUT, "performance"), { recursive: true });

function rmse(a, b) {
  try {
    const out = execFileSync(
      "magick",
      ["compare", "-metric", "RMSE", "-resize", "25%", a, b, "null:"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    return parseFloat(out);
  } catch (error) {
    // `compare` esce con codice 1 quando le immagini differiscono: il valore è su stderr.
    const text = String(error.stderr ?? "");
    const match = text.match(/\(([\d.]+)\)/);
    return match ? parseFloat(match[1]) * 100 : NaN;
  }
}

const report = {};

const browser = await chromium.launch();

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
  });
  const consoleErrors = [];
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
  page.on("pageerror", (e) => consoleErrors.push(e.message));

  await page.goto(`${BASE}/concept/segnale`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  // Geometria reale (dopo che ScrollTrigger ha inserito i pin-spacer).
  const geometry = await page.evaluate((sections) => {
    const doc = document.documentElement;
    const result = {
      pageHeight: doc.scrollHeight,
      viewport: window.innerHeight,
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      pinSpacers: document.querySelectorAll(".pin-spacer").length,
      stickies: [...document.querySelectorAll("*")].filter(
        (n) => getComputedStyle(n).position === "sticky",
      ).length,
      sections: {},
    };
    for (const [name, selector] of sections) {
      const node = document.querySelector(selector);
      if (!node) continue;
      // il pin-spacer sostituisce la sezione nel flusso: misuralo se presente
      const box = node.closest(".pin-spacer") ?? node;
      const rect = box.getBoundingClientRect();
      result.sections[name] = {
        top: Math.round(rect.top + window.scrollY),
        height: Math.round(rect.height),
      };
    }
    return result;
  }, SECTIONS);

  const maxScroll = geometry.pageHeight - geometry.viewport;
  const frames = [];
  const dir = path.join(FRAMES, vp.name);
  mkdirSync(dir, { recursive: true });

  for (let y = 0, i = 0; y <= maxScroll; y += vp.step, i++) {
    await page.evaluate((value) => window.scrollTo(0, value), y);
    await page.waitForTimeout(160);
    const file = path.join(dir, `${String(i).padStart(3, "0")}.png`);
    await page.screenshot({ path: file });
    frames.push({ index: i, y, file });
  }

  // delta visivo fra frame consecutivi, normalizzato per unità di scroll
  for (let i = 1; i < frames.length; i++) {
    frames[i].delta = rmse(frames[i - 1].file, frames[i].file);
  }
  frames[0].delta = 0;

  // sezione di appartenenza di ogni frame (per la mappa del ritmo)
  const which = (y) => {
    const mid = y + geometry.viewport / 2;
    let found = "—";
    for (const [name] of SECTIONS) {
      const s = geometry.sections[name];
      if (s && mid >= s.top && mid < s.top + s.height) found = name;
    }
    return found;
  };
  frames.forEach((f) => (f.section = which(f.y)));

  report[vp.name] = { geometry, step: vp.step, maxScroll, frames, consoleErrors };
  await page.close();

  const vps = (geometry.pageHeight / geometry.viewport).toFixed(2);
  console.log(
    `\n### ${vp.name}  page=${geometry.pageHeight}px  viewport=${geometry.viewport}px  = ${vps} schermate` +
      `  pin-spacer=${geometry.pinSpacers}  sticky=${geometry.stickies}` +
      `  overflow-x=${geometry.scrollWidth > geometry.clientWidth ? "SÌ" : "no"}`,
  );
  for (const [name] of SECTIONS) {
    const s = geometry.sections[name];
    if (s) {
      console.log(
        `  ${name.padEnd(5)} top=${String(s.top).padStart(6)}  h=${String(s.height).padStart(5)}px  ` +
          `(${(s.height / geometry.viewport).toFixed(2)} schermate)`,
      );
    }
  }
  // plateau: corse di frame con delta sotto soglia
  const THRESH = 0.35;
  let run = [];
  const plateaus = [];
  for (const f of frames) {
    if (f.delta < THRESH) run.push(f);
    else {
      if (run.length >= 3) plateaus.push([...run]);
      run = [];
    }
  }
  if (run.length >= 3) plateaus.push([...run]);
  console.log(`  plateau (delta<${THRESH}, >=3 frame consecutivi):`);
  if (!plateaus.length) console.log("    nessuno");
  for (const p of plateaus) {
    const px = (p[p.length - 1].y - p[0].y) + vp.step;
    console.log(
      `    y ${p[0].y}–${p[p.length - 1].y}  (${px}px = ${(px / geometry.viewport).toFixed(2)} schermate)  sezioni: ${[...new Set(p.map((f) => f.section))].join("/")}`,
    );
  }
  if (consoleErrors.length) console.log(`  CONSOLE ERRORS: ${consoleErrors.length}`);
}

await browser.close();
writeFileSync(path.join(OUT, "performance/pacing.json"), JSON.stringify(report, null, 2));
console.log("\nscritto performance/pacing.json");
