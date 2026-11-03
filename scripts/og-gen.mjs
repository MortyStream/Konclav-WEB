// Génère public/og.jpg (image de partage 1200×630, JPEG q82) avec Playwright.
// Usage : npm run og
// À relancer si le H1 du Hero change — le texte est dupliqué ici volontairement
// (pas d'import Astro possible dans un script Node simple).
// Style : clair « Apple » — fond blanc, accent dégradé du logo, iPhone qui sort du bas.

import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const H1_START = "Gérez votre association dans";
const H1_ACCENT = "une seule app.";
const SUB = "L'intranet privé pensé pour les associations suisses.";
const PILLS = ["Fait en Suisse", "Conforme LPD", "Sans engagement"];

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public", "og.jpg");
// Ressources embarquées en data: URI — une page setContent() ne peut pas lire de fichier local (file://)
const MIME = { png: "image/png", webp: "image/webp", woff2: "font/woff2" };
const file = (...p) => `data:${MIME[p.at(-1).split(".").pop()]};base64,${readFileSync(join(root, ...p)).toString("base64")}`;
const font = (w) => file("node_modules", "@fontsource", "inter", "files", `inter-latin-${w}-normal.woff2`);

const html = `<!DOCTYPE html>
<html lang="fr-CH"><head><meta charset="utf-8" />
<style>
  @font-face { font-family: "InterOG"; font-weight: 400; src: url("${font(400)}") format("woff2"); }
  @font-face { font-family: "InterOG"; font-weight: 500; src: url("${font(500)}") format("woff2"); }
  @font-face { font-family: "InterOG"; font-weight: 600; src: url("${font(600)}") format("woff2"); }
  * { margin: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px; overflow: hidden; position: relative;
    background: #ffffff; color: #1d1d1f;
    font-family: "InterOG", -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .text { position: absolute; left: 80px; top: 0; bottom: 0; width: 640px;
    display: flex; flex-direction: column; justify-content: center; }
  .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 44px; }
  .brand img { width: 44px; height: 44px; }
  .brand span { font-size: 28px; font-weight: 600; letter-spacing: -0.02em; }
  h1 { font-size: 66px; font-weight: 600; letter-spacing: -0.035em; line-height: 1.04; }
  .accent { background: linear-gradient(95deg, #b91c3c 0%, #d9480f 55%, #e67700 100%);
    -webkit-background-clip: text; background-clip: text; color: transparent; }
  p { margin-top: 22px; font-size: 25px; line-height: 1.4; color: #6e6e73; }
  .pills { display: flex; gap: 10px; margin-top: 34px; }
  .pill { background: #f5f5f7; border-radius: 999px; padding: 9px 18px; font-size: 18px; font-weight: 500; }
  .stage { position: absolute; right: 70px; top: 70px; width: 340px; }
  .glow { position: absolute; left: 50%; top: 50%; width: 520px; height: 520px; transform: translate(-50%, -40%);
    border-radius: 50%; background: radial-gradient(closest-side, rgba(232,87,42,.22), transparent 72%); }
  .frame { position: relative; width: 340px; aspect-ratio: 260 / 540; border-radius: 58px; padding: 9px;
    background: linear-gradient(150deg, #48484a 0%, #1d1d1f 22%, #0b0b0c 70%, #3a3a3c 100%);
    box-shadow: inset 0 0 0 1.5px rgba(255,255,255,.12), 0 50px 90px -30px rgba(0,0,0,.45); }
  .screen { position: relative; height: 100%; overflow: hidden; border-radius: 49px; background: #000; }
  .screen img { width: 100%; height: 100%; object-fit: cover; object-position: top; }
  .island { position: absolute; left: 50%; top: 10px; width: 102px; height: 30px; transform: translateX(-50%);
    border-radius: 999px; background: #000; }
</style></head>
<body>
  <div class="text">
    <div class="brand"><img src="${file("public", "logo-mark.png")}" alt="" /><span>Konclav</span></div>
    <h1>${H1_START} <span class="accent">${H1_ACCENT}</span></h1>
    <p>${SUB}</p>
    <div class="pills">${PILLS.map((p) => `<span class="pill">${p}</span>`).join("")}</div>
  </div>
  <div class="stage">
    <div class="glow"></div>
    <div class="frame"><div class="screen">
      <img src="${file("public", "app", "accueil.webp")}" alt="" />
      <div class="island"></div>
    </div></div>
  </div>
</body></html>`;

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  try {
    ({ chromium } = createRequire(import.meta.url)("playwright")); // install globale
  } catch {
    console.error("Playwright manquant. Installez-le ponctuellement :\n  npm i -D playwright && npx playwright install chromium");
    process.exit(1);
  }
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 }); // = dimensions annoncées dans les balises og:image
await page.setContent(html, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
await page.screenshot({ path: out, type: "jpeg", quality: 82 });
await browser.close();
console.log(`OG générée → ${out}`);
