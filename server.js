import express from "express";
import compression from "compression";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, "dist");
const port = process.env.PORT || 3000;

// At startup, collect SHA-256 hashes of every inline <script> body in dist/**/*.html.
// CSP script-src then allows only those exact contents — no 'unsafe-inline' needed.
function collectInlineScriptHashes(root) {
  const hashes = new Set();
  if (!existsSync(root)) return hashes;
  const tagRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.endsWith(".html")) continue;
      const html = readFileSync(full, "utf8");
      let m;
      while ((m = tagRe.exec(html)) !== null) {
        const attrs = m[1] || "";
        const body = m[2] || "";
        if (/\ssrc\s*=/.test(attrs)) continue; // external script — covered by src allowlist
        if (!body) continue;
        const hash = crypto.createHash("sha256").update(body, "utf8").digest("base64");
        hashes.add(`'sha256-${hash}'`);
      }
    }
  };
  walk(root);
  return hashes;
}

const scriptHashes = Array.from(collectInlineScriptHashes(distPath));
console.log(`CSP: ${scriptHashes.length} inline-script hash(es) loaded`);

const csp = [
  "default-src 'self'",
  `script-src 'self' ${scriptHashes.join(" ")}`.trim().replace(/\s+/g, " "),
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data:",
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
  res.setHeader("Content-Security-Policy", csp);
  if (
    req.path.startsWith("/sous-traitance") ||
    req.path.startsWith("/404") ||
    req.path.startsWith("/admin")
  ) {
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
  }
  next();
});

app.use(
  express.static(distPath, {
    extensions: ["html"],
    etag: true,
    lastModified: false,
    setHeaders(res, filePath) {
      if (/\.(?:js|css|svg|png|jpg|jpeg|webp|woff2?)$/i.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else if (/\.html$/i.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
      } else {
        res.setHeader("Cache-Control", "public, max-age=300");
      }
    },
  })
);

app.use((req, res) => {
  res.status(404).sendFile(path.join(distPath, "404.html"), (err) => {
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
  console.log(`Konclav up on :${port}`);
});

const shutdown = (sig) => () => {
  console.log(`${sig} received, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on("SIGTERM", shutdown("SIGTERM"));
process.on("SIGINT", shutdown("SIGINT"));
