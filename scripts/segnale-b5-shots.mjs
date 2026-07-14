// QA fase B5 — sequenza frame della hero Segnale (/concept/segnale).
// Uso: node scripts/segnale-b5-shots.mjs <outDir>
// - desktop a 0/8/20/35/42/50/55/62/69/88/100% della corsa;
// - mobile (390×844) a 0/42/50/62/69/100%;
// - spot-check 375×812 e 360×800 al 42%;
// - shot alta densità (deviceScaleFactor 2) al 42% desktop;
// - determinismo reverse: cicli 20→55→20 e 42→69→42 confrontati via buffer;
// - zero errori console, zero overflow.

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const ROUTE = "/concept/segnale";
const OUT = path.resolve(process.argv[2] ?? "segnale-b5-shots");
const DESKTOP_DIR = path.join(OUT, "desktop");
const MOBILE_DIR = path.join(OUT, "mobile");
const QA_DIR = path.join(OUT, "qa");
[DESKTOP_DIR, MOBILE_DIR, QA_DIR].forEach((d) => mkdirSync(d, { recursive: true }));

const DESKTOP = { width: 1440, height: 1000 };
const MOBILE = { width: 390, height: 844 };
const D_FRACTIONS = [0, 0.08, 0.2, 0.35, 0.42, 0.5, 0.55, 0.62, 0.69, 0.88, 1];
const M_FRACTIONS = [0, 0.42, 0.5, 0.62, 0.69, 1];

const errors = [];
let failures = 0;

function watch(page, label) {
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`${label}: ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`${label}: ${e.message}`));
}

const pct = (f) => String(Math.round(f * 100)).padStart(3, "0");

async function scrollTo(page, f) {
  await page.evaluate((fr) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, Math.round(max * fr));
  }, f);
  await page.waitForTimeout(1100);
}

async function assertNoOverflow(page, label) {
  const d = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  if (d.sw > d.cw) {
    failures += 1;
    console.error(`OVERFLOW ${label}: ${d.sw} > ${d.cw}`);
  }
}

const browser = await chromium.launch();

async function sequence(viewport, fractions, dir, prefix, scale = 1) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: scale });
  const page = await ctx.newPage();
  watch(page, prefix);
  await page.goto(BASE + ROUTE, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  for (const f of fractions) {
    await scrollTo(page, f);
    await assertNoOverflow(page, `${prefix}-${pct(f)}`);
    await page.screenshot({
      path: path.join(dir, `${prefix}-${pct(f)}.png`),
      animations: "disabled",
    });
    console.log("saved", `${prefix}-${pct(f)}`);
  }
  await ctx.close();
}

await sequence(DESKTOP, D_FRACTIONS, DESKTOP_DIR, "b5-desktop");
await sequence(MOBILE, M_FRACTIONS, MOBILE_DIR, "b5-mobile");

// spot-check viewport mobile alternativi + alta densità
await sequence({ width: 375, height: 812 }, [0.42], QA_DIR, "b5-375x812");
await sequence({ width: 360, height: 800 }, [0.42], QA_DIR, "b5-360x800");
await sequence(DESKTOP, [0.42], QA_DIR, "b5-desktop-dpr2", 2);

// --- determinismo reverse: lo stato a X% deve essere identico prima e dopo
// un ciclo di andata/ritorno (20→55→20, 42→69→42, 0→100→0) ---
{
  const ctx = await browser.newContext({ viewport: DESKTOP });
  const page = await ctx.newPage();
  watch(page, "reverse-cycles");
  await page.goto(BASE + ROUTE, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const snap = async (f) => {
    await scrollTo(page, f);
    return page.screenshot({ animations: "disabled" });
  };
  const cycles = [
    [0.2, 0.55],
    [0.42, 0.69],
  ];
  for (const [a, b] of cycles) {
    const before = await snap(a);
    await snap(b);
    const after = await snap(a);
    if (Buffer.compare(before, after) !== 0) {
      // tolleranza: confronto pixel reale (il buffer PNG può divergere per
      // metadati); conteggio dei pixel diversi via canvas
      const diff = await page.evaluate(
        async ([b1, b2]) => {
          const load = (src) =>
            new Promise((res, rej) => {
              const i = new Image();
              i.onload = () => res(i);
              i.onerror = rej;
              i.src = "data:image/png;base64," + src;
            });
          const [ia, ib] = await Promise.all([load(b1), load(b2)]);
          const cv = (img) => {
            const c = new OffscreenCanvas(img.width, img.height);
            const x = c.getContext("2d");
            x.drawImage(img, 0, 0);
            return x.getImageData(0, 0, img.width, img.height).data;
          };
          const da = cv(ia), db = cv(ib);
          let px = 0;
          for (let i = 0; i < da.length; i += 4) {
            if (
              Math.abs(da[i] - db[i]) > 2 ||
              Math.abs(da[i + 1] - db[i + 1]) > 2 ||
              Math.abs(da[i + 2] - db[i + 2]) > 2
            )
              px++;
          }
          return px;
        },
        [before.toString("base64"), after.toString("base64")]
      );
      if (diff > 0) {
        failures += 1;
        console.error(`REVERSE CYCLE ${a}→${b}→${a}: ${diff} px di differenza`);
      } else {
        console.log(`reverse cycle ${a}→${b}→${a}: ok (0 px)`);
      }
    } else {
      console.log(`reverse cycle ${a}→${b}→${a}: ok (buffer identico)`);
    }
  }
  // 0→100→0: gli slot devono tornare a trasformazione nulla
  await snap(1);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
  const back = await page.evaluate(() =>
    Array.from(document.querySelectorAll("[data-frag]")).map((n) => {
      const m = new DOMMatrixReadOnly(getComputedStyle(n).transform);
      return Math.abs(m.m41) + Math.abs(m.m42);
    })
  );
  if (!back.every((v) => v < 0.5)) {
    failures += 1;
    console.error("REVERSE 100→0: slot non tornati allo stato iniziale", back);
  } else {
    console.log("reverse 100→0: ok");
  }
  await ctx.close();
}

await browser.close();

if (errors.length) {
  failures += 1;
  console.error("CONSOLE ERRORS:\n" + errors.join("\n"));
} else {
  console.log("no console errors");
}
process.exit(failures ? 1 : 0);
