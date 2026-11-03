// Bascule atomique du build : dist-next/ → dist/.
// `astro build` vide son dossier de sortie au démarrage : construire directement dans
// dist/ laissait le site vide (404) pendant plusieurs secondes, et vide pour de bon si
// le build échouait. On construit donc dans dist-next/, puis on échange les dossiers :
// le site en ligne n'est jamais vide, et un build raté ne touche pas à dist/.
import { existsSync, renameSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const next = join(root, "dist-next");
const live = join(root, "dist");
const prev = join(root, "dist-prev");

if (!existsSync(join(next, "index.html")) || !existsSync(join(next, "404.html"))) {
  console.error("swap-dist : dist-next/ incomplet (index.html ou 404.html absent) — rien n'est basculé, le site en ligne reste intact.");
  process.exit(1);
}

rmSync(prev, { recursive: true, force: true });
if (existsSync(live)) renameSync(live, prev);
renameSync(next, live);
console.log("swap-dist : nouveau build en ligne (le précédent est conservé dans dist-prev/).");
