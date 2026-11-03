// `npm run build` : un seul build à la fois (verrou .build.lock/), build Astro dans
// dist-next/, puis bascule atomique vers dist/ (cf. scripts/swap-dist.mjs).
// Deux builds simultanés (SSH + manager Infomaniak) écriraient dans le même dist-next/ :
// le second attend la fin du premier (5 min max) au lieu de le corrompre.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { heal, paths, swap } from "./swap-dist.mjs";

const LOCK = join(paths.root, ".build.lock");
const GUARD = join(paths.root, ".build.lock-takeover");
const WAIT_MS = 5 * 60 * 1000;
const STALE_MS = 10 * 60 * 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function lockPid() {
  try { return Number(readFileSync(join(LOCK, "pid"), "utf8").split("\n")[0]) || 0; } catch { return 0; }
}

// Le pid du verrou est-il encore un build ? (Linux : /proc ; ailleurs : on se fie à l'âge.)
function pidIsBuild(pid) {
  try { process.kill(pid, 0); } catch (e) { return e.code === "EPERM"; }
  try { return readFileSync(`/proc/${pid}/cmdline`, "utf8").includes("build.mjs"); } catch { return null; }
}

function lockIsStale() {
  let age;
  try { age = Date.now() - statSync(LOCK).mtimeMs; } catch { return false; } // pas de verrou : rien à reprendre
  const pid = lockPid();
  if (!pid) return age > 60_000; // pid pas encore écrit : laisser une minute au propriétaire
  const alive = pidIsBuild(pid);
  if (alive === null) return age > STALE_MS;
  return !alive;
}

function tryAcquire() {
  try {
    mkdirSync(LOCK);
  } catch (e) {
    if (e.code === "EEXIST") return false;
    throw e;
  }
  writeFileSync(join(LOCK, "pid"), `${process.pid}\n${new Date().toISOString()}\n`);
  return true;
}

// Reprise d'un verrou orphelin sous un second verrou : deux builds lancés au même
// instant ne peuvent pas tous les deux le supprimer puis le prendre.
function takeOverIfStale() {
  if (!lockIsStale()) return false;
  try {
    mkdirSync(GUARD);
  } catch (e) {
    if (e.code !== "EEXIST") throw e;
    try { if (Date.now() - statSync(GUARD).mtimeMs > 60_000) rmSync(GUARD, { recursive: true, force: true }); } catch {}
    return false;
  }
  try {
    if (!lockIsStale()) return false;
    rmSync(LOCK, { recursive: true, force: true });
    console.log("build : verrou orphelin d'un build interrompu — supprimé.");
    return true;
  } finally {
    rmSync(GUARD, { recursive: true, force: true });
  }
}

let holding = false;
let child = null;
let interrupted = false;

function releaseLock() {
  if (holding && lockPid() === process.pid) rmSync(LOCK, { recursive: true, force: true });
  holding = false;
}

// Ctrl+C / kill : on arrête le build Astro, on ne bascule rien, on libère le verrou.
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(sig, () => {
    interrupted = true;
    if (child && child.exitCode === null) child.kill(sig);
    else if (!holding) process.exit(130);
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
  if (!(await acquireLock())) {
    if (interrupted) return 130;
    console.error(
      "build : un autre build tourne depuis plus de 5 min (dossier .build.lock/). Attendez sa fin, puis relancez.\n" +
      "        Si aucun build ne tourne, supprimez le dossier .build.lock/ et relancez."
    );
    return 1;
  }
  holding = true;
  try {
    heal();
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
      child.on("error", (err) => resolve({ code: 1, signal: null, err }));
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
