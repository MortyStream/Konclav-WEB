// Génère public/og.jpg (1200×630, JPEG q82, ~27 Ko) avec Playwright.
// Usage : npm run og   (nécessite : npx playwright install chromium)
// À relancer si le H1 du Hero change — le texte est dupliqué ici volontairement
// (pas d'import Astro possible dans un script Node simple).

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const H1 = "Gérez votre association dans une seule app !";
const SUB = "L'intranet privé pensé pour les associations suisses. Tâches, agenda, documents, cotisations, AG, votations.";
const PILLS = ["Conçu en Suisse", "Conforme LPD", "Sans engagement"];

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public", "og.jpg");

const html = `<!DOCTYPE html>
<html lang="fr-CH"><head><meta charset="utf-8" />
<style>
  * { margin: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px; overflow: hidden;
    background: #08090a; color: #f4f4f5;
    font-family: 'Inter', -apple-system, 'Segoe UI', sans-serif;
    display: flex; flex-direction: column; justify-content: center;
    padding: 0 90px; position: relative;
  }
  .halo {
    position: absolute; top: -340px; left: 50%; transform: translateX(-50%);
    width: 1100px; height: 700px; border-radius: 50%;
    background: radial-gradient(closest-side, #5e6ad2, transparent 70%);
    opacity: 0.28; filter: blur(60px);
  }
  .brand { display: flex; align-items: center; gap: 14px; margin-bottom: 40px; }
  .brand img { width: 52px; height: 52px; border-radius: 12px; }
  .brand span { font-size: 30px; font-weight: 700; letter-spacing: -0.02em; }
  .badge {
    display: inline-flex; width: fit-content; margin-bottom: 26px;
    border: 1px solid rgba(94,106,210,.45); background: rgba(94,106,210,.12);
    color: #9b9bff; border-radius: 999px; padding: 8px 18px;
    font-size: 19px; font-weight: 500;
  }
  h1 { font-size: 64px; font-weight: 700; letter-spacing: -0.03em; line-height: 1.08; max-width: 950px; }
  p { margin-top: 24px; font-size: 26px; line-height: 1.45; color: #a1a1aa; max-width: 880px; }
  .pills { display: flex; gap: 14px; margin-top: 38px; }
  .pill {
    border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.03);
    border-radius: 999px; padding: 9px 20px; font-size: 19px; color: #d4d4d8;
  }
</style></head>
<body>
  <div class="halo"></div>
  <div class="brand"><img src="file://${join(root, "public", "logo-mark.png")}" alt="" /><span>Konclav</span></div>
  <div class="badge">Pour les assos suisses</div>
  <h1>${H1}</h1>
  <p>${SUB}</p>
  <div class="pills">${PILLS.map((p) => `<span class="pill">${p}</span>`).join("")}</div>
</body></html>`;

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error("Playwright manquant. Installez-le ponctuellement :\n  npm i -D playwright && npx playwright install chromium");
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: "networkidle" });
await page.screenshot({ path: out, type: "jpeg", quality: 82 });
await browser.close();
console.log(`OG générée → ${out}`);
