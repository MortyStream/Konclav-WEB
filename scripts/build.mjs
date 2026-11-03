// `npm run build` : un seul build à la fois (verrou .build.lock/), build Astro dans
// dist-next/, puis bascule atomique vers dist/ (cf. scripts/swap-dist.mjs).
// Deux builds simultanés (SSH + manager Infomaniak) écriraient dans le même dist-next/ :
// le second attend la fin du premier (5 min max) au lieu de le corrompre.
//
// Le verrou est « vivant » tant que son propriétaire le touche (battement toutes les
// 5 s). Pas de pid : les builds du manager et du SSH ne tournent pas forcément dans le
// même environnement, un pid n'y veut rien dire. Un build tué net (kill -9, timeout du
// manager) cesse de battre ; son verrou est repris 2 min plus tard, le temps qu'un
// éventuel build Astro orphelin se termine.
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";
import { heal, paths, swap } from "./swap-dist.mjs";

const LOCK = join(paths.root, ".build.lock");
const OWNER = join(LOCK, "owner");
const GUARD = join(paths.root, ".build.lock-takeover");
const HEARTBEAT_MS = 5_000;
const STALE_MS = 2 * 60 * 1000;
const WAIT_MS = 5 * 60 * 1000;
const TOKEN = randomUUID();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const lockAge = (dir) => {
  try { return Date.now() - statSync(dir).mtimeMs; } catch { return null; }
};
const ownsLock = () => {
  try { return readFileSync(OWNER, "utf8").split("\n")[0] === TOKEN; } catch { return false; }
};

function tryAcquire() {
  try {
    mkdirSync(LOCK);
  } catch (e) {
    if (e.code === "EEXIST") return false;
    throw e;
  }
  writeFileSync(OWNER, `${TOKEN}\npid ${process.pid} sur ${hostname()}\n${new Date().toISOString()}\n`);
  return true;
}

// Reprise d'un verrou qui ne bat plus, sous un second verrou : deux builds lancés au
// même instant ne peuvent pas tous les deux le supprimer puis le prendre.
function takeOverIfStale() {
  const age = lockAge(LOCK);
  if (age === null || age < STALE_MS) return false;
  try {
    mkdirSync(GUARD);
  } catch (e) {
    if (e.code !== "EEXIST") throw e;
    const g = lockAge(GUARD);
    if (g !== null && g > 60_000) rmSync(GUARD, { recursive: true, force: true });
    return false;
  }
  try {
    const again = lockAge(LOCK);
    if (again === null || again < STALE_MS) return false;
    rmSync(LOCK, { recursive: true, force: true });
    console.log("build : verrou d'un build interrompu (plus de signe de vie depuis 2 min) — repris.");
    return true;
  } finally {
    rmSync(GUARD, { recursive: true, force: true });
  }
}

let holding = false;
let heartbeat = null;
let child = null;
let interrupted = false;
let finished = false;

function releaseLock() {
  clearInterval(heartbeat);
  if (holding && ownsLock()) rmSync(LOCK, { recursive: true, force: true });
  holding = false;
}

// Ctrl+C / kill : on arrête le build Astro, on ne bascule rien, on libère le verrou.
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(sig, () => {
    if (finished) return;
    interrupted = true;
    if (child && child.exitCode === null && child.signalCode === null) child.kill(sig);
    else if (!holding) {
      console.error("build : interrompu pendant l'attente — rien n'a été lancé.");
      process.exit(130);
    }
  });
}

async function acquireLock() {
  const start = Date.now();
  let announced = false;
  while (!interrupted) {
    if (tryAcquire()) return true;
    if (takeOverIfStale()) continue;
    if (Date.now() - start > WAIT_MS) return false;
    if (!announced) {
      console.log("build : un autre build est en cours — attente de sa fin…");
      announced = true;
    }
    await sleep(1000);
  }
  return false;
}

async function main() {
  try {
    if (!(await acquireLock())) {
      if (interrupted) return 130;
      console.error(
        "build : un autre build tourne depuis plus de 5 min (dossier .build.lock/). Attendez sa fin, puis relancez.\n" +
        "        Si aucun build ne tourne, supprimez le dossier .build.lock/ et relancez."
      );
      return 1;
    }
  } catch (err) {
    console.error(`build : impossible de créer le verrou .build.lock/ (${err.code || err.message}) — vérifiez les droits et l'espace disque.`);
    return 1;
  }
  holding = true;
  heartbeat = setInterval(() => {
    try { if (ownsLock()) utimesSync(LOCK, new Date(), new Date()); } catch {}
  }, HEARTBEAT_MS);

  try {
    try {
      heal();
    } catch (err) {
      console.error(`build : réparation de dist/ impossible (${err.code || err.message}) — relancez « node scripts/swap-dist.mjs ».`);
      return 1;
    }
    const astroBin = join(paths.root, "node_modules", "astro", "bin", "astro.mjs");
    if (!existsSync(astroBin)) {
      console.error("build : astro introuvable — lancez « npm install » d'abord.");
      return 1;
    }
    if (interrupted) return 130;
    child = spawn(process.execPath, [astroBin, "build", "--outDir", "dist-next"], {
      cwd: paths.root,
      stdio: "inherit",
    });
    const { code, signal } = await new Promise((resolve) => {
      child.on("error", () => resolve({ code: 1, signal: null }));
      child.on("exit", (code, signal) => resolve({ code, signal }));
    });
    if (interrupted || signal) {
      console.error("build : interrompu — rien n'est basculé, le site en ligne reste intact.");
      return 130;
    }
    if (code !== 0) {
      console.error("build : échec du build Astro — rien n'est basculé, le site en ligne reste intact.");
      return code || 1;
    }
    return swap() ? 0 : 1;
  } catch (err) {
    console.error(`build : ${err.code || err.message} — le site en ligne reste intact.`);
    return 1;
  } finally {
    releaseLock();
  }
}

process.exitCode = await main();
finished = true;
