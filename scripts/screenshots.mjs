import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const OUT = path.resolve(
  process.cwd(),
  "../runs/2026-07-10-marketing-strategy-generator/screenshots"
);

const shots = [
  { route: "/concept/desktop-initial", width: 1440, height: 1000 },
  { route: "/concept/desktop-final", width: 1440, height: 1000 },
  { route: "/concept/mobile-initial", width: 390, height: 844 },
  { route: "/concept/mobile-final", width: 390, height: 844 },
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const consoleErrors = [];

for (const { route, width, height } of shots) {
  const page = await browser.newPage({ viewport: { width, height } });
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`${route}: ${msg.text()}`);
  });
  page.on("pageerror", (err) => consoleErrors.push(`${route}: ${err.message}`));
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  await page.waitForTimeout(400); // font e immagini assestati
  const file = path.join(OUT, route.split("/").pop() + ".png");
  await page.screenshot({ path: file, fullPage: true });
  console.log("saved", file);
  await page.close();
}

await browser.close();

if (consoleErrors.length) {
  console.error("CONSOLE ERRORS:\n" + consoleErrors.join("\n"));
  process.exit(1);
}
console.log("no console errors");
