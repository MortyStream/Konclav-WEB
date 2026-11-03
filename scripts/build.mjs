// `npm run build` : un seul build à la fois (verrou .build.lock/), build Astro dans
// dist-next/, puis bascule atomique vers dist/ (cf. scripts/swap-dist.mjs).
// Deux builds simultanés (SSH + manager Infomaniak) écriraient dans le même dist-next/ :
// le second attend la fin du premier au lieu de le corrompre.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { heal, paths, swap } from "./swap-dist.mjs";

const LOCK = join(paths.root, ".build.lock");
const STALE_MS = 10 * 60 * 1000;

function lockIsStale() {
  let age = 0;
  try { age = Date.now() - statSync(LOCK).mtimeMs; } catch { return true; }
  if (age > STALE_MS) return true;
  let pid = 0;
  try { pid = Number(readFileSync(join(LOCK, "pid"), "utf8").split("\n")[0]); } catch {}
  if (!pid) return age > 60_000;
  try { process.kill(pid, 0); return false; } catch (e) { return e.code === "ESRCH"; }
}

function acquireLock() {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      mkdirSync(LOCK);
      writeFileSync(join(LOCK, "pid"), `${process.pid}\n${new Date().toISOString()}\n`);
      return true;
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      if (attempt === 0 && lockIsStale()) {
        console.log("build : verrou orphelin d'un build interrompu — supprimé.");
        rmSync(LOCK, { recursive: true, force: true });
        continue;
      }
      return false;
    }
  }
  return false;
}

const releaseLock = () => rmSync(LOCK, { recursive: true, force: true });

if (!acquireLock()) {
  console.error(
    "build : un autre build est déjà en cours (dossier .build.lock/). Attendez la fin, puis relancez.\n" +
    "        Si aucun build ne tourne, supprimez le dossier .build.lock/ et relancez."
  );
  process.exit(1);
}

// Ctrl+C / arrêt : on laisse le build Astro s'arrêter, on ne bascule rien, on libère le verrou.
let interrupted = false;
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(sig, () => { interrupted = true; });

let code = 1;
try {
  heal();
  const astroBin = join(paths.root, "node_modules", "astro", "bin", "astro.mjs");
  if (!existsSync(astroBin)) throw new Error("astro introuvable — lancez « npm install » d'abord.");
  const res = spawnSync(process.execPath, [astroBin, "build", "--outDir", "dist-next"], {
    cwd: paths.root,
    stdio: "inherit",
  });
  if (interrupted || res.signal) {
    console.error("build : interrompu — rien n'est basculé, le site en ligne reste intact.");
    code = 130;
  } else if (res.status !== 0) {
    console.error("build : échec du build Astro — rien n'est basculé, le site en ligne reste intact.");
    code = res.status || 1;
  } else {
    code = swap() ? 0 : 1;
  }
} finally {
  releaseLock();
}
process.exit(code);
