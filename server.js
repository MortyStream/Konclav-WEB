import express from "express";
import compression from "compression";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { readFileSync, statSync, existsSync, openSync, fstatSync, closeSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, "dist");
const indexPath = path.join(distPath, "index.html");
const notFoundPath = path.join(distPath, "404.html");
const port = process.env.PORT || 3000;
// Révision de ce fichier, renvoyée en en-tête X-Konclav-Server et affichée au démarrage :
// `curl -sI https://konclav.ch/ | grep -i x-konclav` dit quel server.js tourne réellement.
const SERVER_REV = "2026-11-03.3";

// ------------------------------------------------------------------
// CSP : script-src n'autorise que les hashes SHA-256 des <script> inline
// de la page réellement servie — pas de 'unsafe-inline'. Calculés par
// fichier HTML et mis en cache par fichier (inode, mtime, taille) : une page
// reconstruite reçoit aussitôt ses propres hashes, sans redémarrer le
// serveur après un build (avant, les hashes étaient figés au démarrage et
// un build sans redémarrage bloquait le formulaire et le cockpit).
// ------------------------------------------------------------------
const INLINE_SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;

function inlineScriptHashes(html) {
  const hashes = new Set();
  for (const m of html.matchAll(INLINE_SCRIPT_RE)) {
    const attrs = m[1] || "";
    const body = m[2] || "";
    if (/\ssrc\s*=/.test(attrs)) continue; // script externe — couvert par 'self'
    if (!body) continue;
    const hash = crypto.createHash("sha256").update(body, "utf8").digest("base64");
    hashes.add(`'sha256-${hash}'`);
  }
  return Array.from(hashes);
}

function buildCsp(scriptHashes) {
  return [
    "default-src 'self'",
    `script-src 'self' ${scriptHashes.join(" ")}`.trim().replace(/\s+/g, " "),
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: https://ehbdngidjrkhfrprfgqg.supabase.co",
    "connect-src 'self' https://ehbdngidjrkhfrprfgqg.supabase.co",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
    "worker-src 'none'",
    "manifest-src 'self'",
    "child-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

// Réponses non-HTML (assets, redirections, page de maintenance) : aucun script inline.
const BASE_CSP = buildCsp([]);

const statKey = (st) => `${st.dev}:${st.ino}:${st.mtimeMs}:${st.size}`;

// Lit un fichier et son identité depuis le MÊME descripteur : la clé de cache décrit
// exactement le contenu haché, même si dist/ est basculé pendant la lecture.
function readSnapshot(filePath) {
  const fd = openSync(filePath, "r");
  try {
    return { key: statKey(fstatSync(fd)), html: readFileSync(fd, "utf8") };
  } finally {
    closeSync(fd);
  }
}

const cspCache = new Map(); // chemin du fichier HTML → { key, csp }
function cspForHtml(filePath, stat) {
  const cached = cspCache.get(filePath);
  if (cached && stat && cached.key === statKey(stat)) return cached.csp;
  try {
    const snap = readSnapshot(filePath);
    const csp = buildCsp(inlineScriptHashes(snap.html));
    cspCache.set(filePath, { key: snap.key, csp });
    return csp;
  } catch {
    // fichier momentanément absent (bascule de build) : dernière CSP connue de la page
    return cached?.csp ?? BASE_CSP;
  }
}

const permissionsPolicy = [
  "accelerometer=()",
  "ambient-light-sensor=()",
  "autoplay=()",
  "battery=()",
  "camera=()",
  "display-capture=()",
  "encrypted-media=()",
  "fullscreen=(self)",
  "geolocation=()",
  "gyroscope=()",
  "hid=()",
  "idle-detection=()",
  "magnetometer=()",
  "microphone=()",
  "midi=()",
  "payment=()",
  "picture-in-picture=()",
  "publickey-credentials-get=()",
  "screen-wake-lock=()",
  "serial=()",
  "usb=()",
  "web-share=()",
  "xr-spatial-tracking=()",
  "browsing-topics=()",
  "interest-cohort=()",
].join(", ");

// Page autonome (aucune ressource de dist/) servie si le site n'est pas construit
// ou si un fichier disparaît pendant une bascule de build.
const maintenanceHtml = (seconds) => `<!doctype html><html lang="fr-CH"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="${seconds}"><meta name="robots" content="noindex"><title>Mise à jour en cours — Konclav</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#fff;color:#1d1d1f;font:17px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;text-align:center}h1{margin:0 0 8px;font-size:28px;letter-spacing:-.02em}p{margin:0;color:#6e6e73}</style><main><h1>Mise à jour en cours</h1><p>Le site est en train d'être mis à jour.<br>Cette page se recharge toute seule dans quelques secondes.</p></main></html>`;

function sendMaintenance(res, retryAfter = 10) {
  for (const h of ["ETag", "Content-Range", "Accept-Ranges", "Last-Modified"]) res.removeHeader(h);
  res
    .status(503)
    .set({
      "Retry-After": String(retryAfter),
      "Cache-Control": "no-store",
      "Content-Security-Policy": BASE_CSP,
    })
    .type("html")
    .send(maintenanceHtml(retryAfter));
}

// 404.html gardée en mémoire (rechargée quand le fichier change) : la page reste
// stylée même pendant la fraction de seconde où dist/ est basculé.
const FALLBACK_404 =
  "<!doctype html><meta charset=utf-8><title>404</title><h1>404 — Page introuvable</h1>";
let notFoundPage = null; // { key, body, csp }
function loadNotFound() {
  try {
    const st = statSync(notFoundPath);
    if (notFoundPage && notFoundPage.key === statKey(st)) return notFoundPage;
    const snap = readSnapshot(notFoundPath);
    notFoundPage = { key: snap.key, body: snap.html, csp: buildCsp(inlineScriptHashes(snap.html)) };
  } catch {
    // absente pendant une bascule : dernière version connue
  }
  return notFoundPage;
}

const distIno = () => {
  try { return statSync(distPath).ino; } catch { return null; }
};

function respond404(req, res) {
  for (const h of ["ETag", "Content-Range", "Accept-Ranges", "Last-Modified"]) res.removeHeader(h);
  // Un 404 n'est jamais mis en cache : un 404 passager ne doit pas « coller ».
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  const page = loadNotFound();
  if (!page) return res.status(404).type("html").send(FALLBACK_404);
  res.setHeader("Content-Security-Policy", page.csp);
  res.status(404).type("html").send(page.body);
}

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.set("etag", "strong");

app.use(compression());

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader("Origin-Agent-Cluster", "?1");
  res.setHeader("Permissions-Policy", permissionsPolicy);
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  res.setHeader("Content-Security-Policy", BASE_CSP);
  res.setHeader("X-Konclav-Server", SERVER_REV);
  res.locals.distIno = distIno();
  if (
    req.path.startsWith("/sous-traitance") ||
    req.path.startsWith("/404") ||
    req.path.startsWith("/admin") ||
    req.path.startsWith("/espace")
  ) {
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
  }
  next();
});

// Redirection permanente : ancien lien /demo → /inscription (après les en-têtes de sécurité)
app.get(/^\/demo\/?$/, (req, res) => {
  res.redirect(301, "/inscription/");
});

// Site non construit (premier déploiement, ou dist/ supprimé à la main) : 503
// « mise à jour en cours » honnête, jamais mis en cache, plutôt qu'un 404 trompeur
// sur toutes les pages. (Une bascule interrompue est réparée par scripts/swap-dist.mjs.)
app.use((req, res, next) => {
  if (existsSync(indexPath)) return next();
  sendMaintenance(res);
});

// Aucun fichier trouvé. Si dist/ a été basculé pendant la requête, la page existe
// peut-être dans le nouveau build : un seul nouvel essai avant de conclure.
function sendNotFound(req, res) {
  if (!existsSync(indexPath)) return sendMaintenance(res);
  const ino = distIno();
  if (res.locals.distIno !== undefined && ino !== res.locals.distIno) {
    if (res.locals.retried) return sendMaintenance(res, 1);
    res.locals.retried = true;
    res.locals.distIno = ino;
    return serveStatic(req, res, () => sendNotFound(req, res));
  }
  respond404(req, res);
}

// /404 et /404.html, y compris encodés (/%34%30%34) ou non normalisés (//404, /x/../404) :
// vrai statut 404 (sinon express.static servirait 404.html en 200).
app.use((req, res, next) => {
  let p;
  try {
    p = path.posix.normalize(decodeURIComponent(req.path));
  } catch {
    return next();
  }
  if (/^\/+404(?:\.html)?\/?$/i.test(p)) return respond404(req, res);
  next();
});

const serveStatic = express.static(distPath, {
  extensions: ["html"],
  etag: true,
  lastModified: false,
  setHeaders(res, filePath, stat) {
    if (filePath.includes(`${path.sep}_astro${path.sep}`)) {
      // noms hachés par Vite : le contenu ne change jamais à URL constante
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    } else if (/\.(?:svg|png|jpe?g|webp|ico|woff2?)$/i.test(filePath)) {
      // public/ (logo, og.jpg, captures) : même URL d'un build à l'autre
      res.setHeader("Cache-Control", "public, max-age=86400");
    } else if (/\.html$/i.test(filePath)) {
      res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
      res.setHeader("Content-Security-Policy", cspForHtml(filePath, stat));
    } else {
      res.setHeader("Cache-Control", "public, max-age=300");
    }
  },
});
app.use(serveStatic);

app.use(sendNotFound);

// Erreur de lecture (fichier disparu pendant une bascule…) : jamais de trace avec le
// chemin du serveur, une page « mise à jour en cours » qui se recharge seule.
app.use((err, req, res, next) => {
  console.error(`${req.method} ${req.path} → ${err.code || err.message}`);
  if (res.headersSent) return req.socket.destroy();
  sendMaintenance(res, 5);
});

const server = app.listen(port, () => {
  let built;
  try {
    built = `index.html du ${statSync(indexPath).mtime.toISOString()}, ${inlineScriptHashes(readFileSync(indexPath, "utf8")).length} hash(es) CSP`;
  } catch {
    built = "index.html ABSENT — page « mise à jour en cours » servie";
  }
  console.log(`Konclav up on :${port} — server.js ${SERVER_REV} — dist=${distPath} — ${built}`);
});

const shutdown = (sig) => () => {
  console.log(`${sig} received, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on("SIGTERM", shutdown("SIGTERM"));
process.on("SIGINT", shutdown("SIGINT"));
