// Bascule atomique du build : dist-next/ → dist/, avec retour arrière.
// `astro build` vide son dossier de sortie au démarrage : construire directement dans
// dist/ laissait le site vide (404) pendant plusieurs secondes, et vide pour de bon si
// le build échouait. On construit donc dans dist-next/ (cf. scripts/build.mjs), puis on
// échange les dossiers. Garanties :
//   - un build incomplet n'est jamais mis en ligne (liste REQUIRED ci-dessous) ;
//   - si la bascule échoue à mi-chemin, l'ancien dist/ est remis en place ;
//   - si elle a été interrompue (process tué entre les deux renommages), le lancement
//     suivant répare d'abord : `node scripts/swap-dist.mjs` suffit.
// dist-prev/ garde le build précédent : `mv dist dist-x && mv dist-prev dist` pour revenir en arrière.
import { existsSync, readdirSync, realpathSync, renameSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export const paths = {
  root,
  next: join(root, "dist-next"),
  live: join(root, "dist"),
  prev: join(root, "dist-prev"),
};

// Fichiers sans lesquels un build n'est pas mis en ligne (sitemap = écrit en tout dernier).
const REQUIRED = [
  "index.html",
  "404.html",
  "admin/index.html",
  "espace/index.html",
  "tarifs/index.html",
  "inscription/index.html",
  "sitemap-index.xml",
];

export function missingFiles(dir) {
  const missing = REQUIRED.filter((f) => !existsSync(join(dir, f)));
  let assets = [];
  try { assets = readdirSync(join(dir, "_astro")); } catch {}
  if (!assets.length) missing.push("_astro/ (vide)");
  return missing;
}

export function heal() {
  const { live, prev } = paths;
  if (!existsSync(join(live, "index.html")) && existsSync(join(prev, "index.html"))) {
    if (existsSync(live)) renameSync(live, `${live}-broken-${Date.now()}`);
    renameSync(prev, live);
    console.log("swap-dist : dist/ manquait (bascule interrompue) — le build précédent est remis en ligne.");
  }
}

function removeLeftovers() {
  for (const name of readdirSync(root)) {
    if (/^dist-(?:prev-trash|broken)-\d+$/.test(name)) rmSync(join(root, name), { recursive: true, force: true });
  }
}

export function swap() {
  const { next, live, prev } = paths;
  try {
    heal();
  } catch (err) {
    console.error(`swap-dist : réparation de dist/ impossible (${err.code || err.message}) — rien n'est basculé.`);
    return false;
  }

  const missing = missingFiles(next);
  if (missing.length) {
    console.error(`swap-dist : dist-next/ incomplet (manque : ${missing.join(", ")}) — rien n'est basculé, le site en ligne reste intact.`);
    return false;
  }

  // dist-prev/ n'est supprimé qu'une fois la bascule réussie.
  const hadLive = existsSync(live);
  let trash = null;
  try {
    if (existsSync(prev)) {
      const t = `${prev}-trash-${Date.now()}`;
      renameSync(prev, t);
      trash = t;
    }
    if (hadLive) renameSync(live, prev);
    renameSync(next, live);
  } catch (err) {
    try {
      if (hadLive && !existsSync(live) && existsSync(prev)) renameSync(prev, live);
      if (trash && !existsSync(prev)) renameSync(trash, prev);
      console.error(`swap-dist : bascule impossible (${err.code || err.message}) — l'ancien build est remis en ligne, rien n'a changé.`);
    } catch (rollbackErr) {
      console.error(`swap-dist : bascule ET retour arrière impossibles (${rollbackErr.code || rollbackErr.message}). Relancez « node scripts/swap-dist.mjs » pour réparer.`);
    }
    return false;
  }

  try { removeLeftovers(); } catch {}
  console.log(
    hadLive
      ? "swap-dist : nouveau build en ligne (le précédent est conservé dans dist-prev/)."
      : "swap-dist : premier build en ligne (aucun build précédent à conserver)."
  );
  return true;
}

// Lancé directement : répare une bascule interrompue, puis bascule dist-next/ s'il est complet.
const isMain = (() => {
  try { return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; }
})();
if (isMain) {
  if (!existsSync(paths.next)) {
    try { heal(); } catch (err) { console.error(`swap-dist : réparation impossible (${err.code || err.message}).`); process.exit(1); }
    console.log(existsSync(join(paths.live, "index.html"))
      ? "swap-dist : rien à basculer (pas de dist-next/), dist/ est en place."
      : "swap-dist : ni dist-next/ ni build précédent — lancez « npm run build ».");
    process.exit(existsSync(join(paths.live, "index.html")) ? 0 : 1);
  }
  process.exit(swap() ? 0 : 1);
}
