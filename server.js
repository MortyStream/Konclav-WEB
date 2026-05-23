import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, "dist");
const port = process.env.PORT || 3000;

const app = express();

app.disable("x-powered-by");

app.use(
  express.static(distPath, {
    extensions: ["html"],
    setHeaders(res, filePath) {
      if (/\.(?:js|css|svg|png|jpg|jpeg|webp|woff2?)$/i.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else {
        res.setHeader("Cache-Control", "public, max-age=300");
      }
    },
  })
);

app.use((req, res) => {
  res.status(404).sendFile(path.join(distPath, "404.html"));
});

app.listen(port, () => {
  console.log(`Konclav up on :${port}`);
});
