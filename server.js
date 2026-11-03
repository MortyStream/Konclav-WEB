import express from "express";
import compression from "compression";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { readFileSync, statSync, existsSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, "dist");
const indexPath = path.join(distPath, "index.html");
const notFoundPath = path.join(distPath, "404.html");
const port = process.env.PORT || 3000;

// ------------------------------------------------------------------
// CSP : script-src n'autorise que les hashes SHA-256 des <script> inline
// de la page réellement servie — pas de 'unsafe-inline'. Calculés par
// fichier HTML et mis en cache par (chemin, mtime, taille) : une page
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

const cspCache = new Map(); // chemin du fichier HTML → { key, csp }
function cspForHtml(filePath, stat) {
  const key = `${stat.mtimeMs}:${stat.size}`;
  const cached = cspCache.get(filePath);
  if (cached && cached.key === key) return cached.csp;
  let csp = BASE_CSP;
  try {
    csp = buildCsp(inlineScriptHashes(readFileSync(filePath, "utf8")));
  } catch {
    // fichier remplacé entre-temps : la CSP stricte s'applique, recalcul à la prochaine requête
    return BASE_CSP;
  }
  cspCache.set(filePath, { key, csp });
  return csp;
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

// Page autonome (aucune ressource de dist/) servie si le site n'est pas construit.
const MAINTENANCE_HTML = `<!doctype html><html lang="fr-CH"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="10"><meta name="robots" content="noindex"><title>Mise à jour en cours — Konclav</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#fff;color:#1d1d1f;font:17px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;text-align:center}h1{margin:0 0 8px;font-size:28px;letter-spacing:-.02em}p{margin:0;color:#6e6e73}</style><main><h1>Mise à jour en cours</h1><p>Le site est en train d'être mis à jour.<br>Cette page se recharge toute seule dans quelques secondes.</p></main></html>`;

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.set("etag", "strong");

app.use(compression());

// Redirection permanente : ancien lien /demo → /inscription
app.get(/^\/demo\/?$/, (req, res) => {
  res.redirect(301, "/inscription/");
});

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

// Site non construit (premier déploiement, ou build raté avant l'introduction du
// build atomique) : 503 « mise à jour en cours » honnête, jamais mis en cache,
// plutôt qu'un 404 trompeur sur toutes les pages.
app.use((req, res, next) => {
  if (existsSync(indexPath)) return next();
  res
    .status(503)
    .set({ "Retry-After": "10", "Cache-Control": "no-store" })
    .type("html")
    .send(MAINTENANCE_HTML);
});

app.use(
  express.static(distPath, {
    extensions: ["html"],
    etag: true,
    lastModified: false,
    setHeaders(res, filePath, stat) {
      if (/\.(?:js|css|svg|png|jpg|jpeg|webp|woff2?)$/i.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else if (/\.html$/i.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
        res.setHeader("Content-Security-Policy", cspForHtml(filePath, stat));
      } else {
        res.setHeader("Cache-Control", "public, max-age=300");
      }
    },
  })
);

app.use((req, res) => {
  // Un 404 n'est jamais mis en cache : un 404 passager ne doit pas « coller ».
  res.setHeader("Cache-Control", "no-store");
  try {
    res.setHeader("Content-Security-Policy", cspForHtml(notFoundPath, statSync(notFoundPath)));
  } catch {
    // 404.html absente : le repli ci-dessous n'a pas de script
  }
  res.status(404).sendFile(notFoundPath, (err) => {
    if (err && !res.headersSent) {
      res
        .status(404)
        .type("html")
        .send(
          "<!doctype html><meta charset=utf-8><title>404</title><h1>404 — Page introuvable</h1>"
        );
    }
  });
});

const server = app.listen(port, () => {
  const built = existsSync(indexPath)
    ? `index.html du ${statSync(indexPath).mtime.toISOString()}, ${inlineScriptHashes(readFileSync(indexPath, "utf8")).length} hash(es) CSP`
    : "ABSENT — page « mise à jour en cours » servie";
  console.log(`Konclav up on :${port} — dist=${distPath} — ${built}`);
});

const shutdown = (sig) => () => {
  console.log(`${sig} received, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on("SIGTERM", shutdown("SIGTERM"));
process.on("SIGINT", shutdown("SIGINT"));
