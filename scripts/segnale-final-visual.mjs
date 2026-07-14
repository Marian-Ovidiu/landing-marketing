// FASE SEGNALE-FINAL-01 — transizioni, full-page compositi, coda S03+S04,
// performance cumulativa (long task, frame stability, memoria, strict mode).

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const RUN = path.resolve("../runs/2026-07-10-marketing-strategy-generator");
const OUT = path.join(RUN, "screenshots/segnale-full-page-final-review");
const URL = `${BASE}/concept/segnale`;
for (const d of ["transitions", "full-page", "performance", "desktop", "mobile"])
  mkdirSync(path.join(OUT, d), { recursive: true });

const browser = await chromium.launch();

/* ---------- 1. transizioni: i quattro raccordi ---------- */
// Ogni raccordo è campionato attorno al confine reale fra le sezioni:
// 3 frame (prima / sul confine / dopo) per vedere il rilascio del pin.
for (const [label, width, height] of [
  ["desktop", 1440, 1000],
  ["mobile", 390, 844],
]) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const tops = await page.evaluate(() => {
    const at = (id) => {
      const n = document.getElementById(id);
      const box = n.closest(".pin-spacer") ?? n;
      return Math.round(box.getBoundingClientRect().top + window.scrollY);
    };
    return {
      s01: at("section-01-come-funziona"),
      s02: at("section-02-esempio-di-piano"),
      s03: at("section-03-cosa-ricevi"),
      s04: at("section-04-cta-finale"),
    };
  });

  const handoffs = [
    ["hero-s01", tops.s01],
    ["s01-s02", tops.s02],
    ["s02-s03", tops.s03],
    ["s03-s04", tops.s04],
  ];
  for (const [name, boundary] of handoffs) {
    const shots = [];
    for (const [tag, y] of [
      ["a-prima", boundary - Math.round(height * 0.45)],
      ["b-confine", boundary],
      ["c-dopo", boundary + Math.round(height * 0.45)],
    ]) {
      await page.evaluate((v) => window.scrollTo(0, Math.max(0, v)), y);
      await page.waitForTimeout(450);
      const file = path.join(OUT, "transitions", `${label}-${name}-${tag}.png`);
      await page.screenshot({ path: file });
      shots.push(file);
    }
    console.log(`  ${label} ${name}: confine y=${boundary}`);
  }
  await page.close();
}

/* ---------- 2. full-page compositi (stitch a passo di viewport) ---------- */
// Una fullPage screenshot su una pagina con pin/sticky mente: renderizza
// tutto allo stato di scroll 0. Il composito per schermate è ciò che si vede.
for (const [label, width, height] of [
  ["desktop-1440x1000", 1440, 1000],
  ["desktop-1280x800", 1280, 800],
  ["mobile-390x844", 390, 844],
  ["mobile-360x800", 360, 800],
]) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const max = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );
  const files = [];
  const dir = path.join(OUT, "full-page", label);
  mkdirSync(dir, { recursive: true });
  for (let i = 0, y = 0; y <= max; y += height, i++) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(400);
    const f = path.join(dir, `${String(i).padStart(2, "0")}.png`);
    await page.screenshot({ path: f });
    files.push(f);
  }
  console.log(`  full-page ${label}: ${files.length} schermate`);
  await page.close();
}

/* ---------- 3. performance cumulativa ---------- */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const longTasks = [];
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    window.__lt = [];
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__lt.push(Math.round(e.duration));
    }).observe({ type: "longtask", buffered: true });
    window.__frames = [];
    let last = performance.now();
    const tick = (t) => {
      window.__frames.push(t - last);
      last = t;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.waitForTimeout(500);

  const inventory = await page.evaluate(() => ({
    svg: document.querySelectorAll("svg").length,
    pinSpacers: document.querySelectorAll(".pin-spacer").length,
    sticky: [...document.querySelectorAll("*")].filter(
      (n) => getComputedStyle(n).position === "sticky",
    ).length,
    willChange: [...document.querySelectorAll("*")].filter(
      (n) => getComputedStyle(n).willChange !== "auto",
    ).length,
    domNodes: document.querySelectorAll("*").length,
  }));

  // scroll completo andata e ritorno, misurando i frame
  const max = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );
  await page.evaluate(() => (window.__frames = []));
  for (let y = 0; y <= max; y += 60) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(16);
  }
  for (let y = max; y >= 0; y -= 60) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(16);
  }
  const perf = await page.evaluate(() => {
    const f = window.__frames.filter((x) => x > 0);
    f.sort((a, b) => a - b);
    const pct = (p) => f[Math.floor(f.length * p)] ?? 0;
    return {
      longTasks: window.__lt,
      frames: f.length,
      p50: +pct(0.5).toFixed(1),
      p95: +pct(0.95).toFixed(1),
      worst: +Math.max(...f).toFixed(1),
      over32ms: f.filter((x) => x > 32).length,
      memoryMB: performance.memory
        ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1)
        : null,
    };
  });

  // memoria dopo un giro completo + reload (cleanup)
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const afterReload = await page.evaluate(() => ({
    pinSpacers: document.querySelectorAll(".pin-spacer").length,
    sticky: [...document.querySelectorAll("*")].filter(
      (n) => getComputedStyle(n).position === "sticky",
    ).length,
    memoryMB: performance.memory
      ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1)
      : null,
  }));

  const report = { inventory, perf, afterReload };
  writeFileSync(
    path.join(OUT, "performance/performance.json"),
    JSON.stringify(report, null, 2),
  );
  console.log("\n== performance ==");
  console.log(`  DOM=${inventory.domNodes} nodi  SVG=${inventory.svg}  pin-spacer=${inventory.pinSpacers}  sticky=${inventory.sticky}  will-change attivi=${inventory.willChange}`);
  console.log(`  long task: ${perf.longTasks.length ? perf.longTasks.join("ms, ") + "ms" : "nessuno"}`);
  console.log(`  frame durante scroll completo: ${perf.frames}  p50=${perf.p50}ms  p95=${perf.p95}ms  peggiore=${perf.worst}ms  >32ms: ${perf.over32ms}`);
  console.log(`  heap dopo andata+ritorno: ${perf.memoryMB}MB  → dopo reload: ${afterReload.memoryMB}MB`);
  console.log(`  cleanup dopo reload: pin-spacer=${afterReload.pinSpacers} sticky=${afterReload.sticky} (attesi 1 e 3 = nessun duplicato)`);
  await page.close();
}

await browser.close();
console.log("\nfatto.");
