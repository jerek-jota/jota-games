// Builds the app from src/ into the repo root.
//   node src/build.js            -> index.html + sw.js (installable, offline)
//   node src/build.js out.html   -> also writes a single-file preview page to out.html
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const SRC = __dirname;
const ROOT = path.join(SRC, "..");
const read = (f) => fs.readFileSync(path.join(SRC, f), "utf8");

const words = read("words.txt").split(/\s+/).filter(Boolean);
const gen = read("gen.js");
const app = read("app.src.html")
  .replace('"__WORDS__"', () => JSON.stringify(words.join(" ")))
  .replace("__GEN__", () => gen);

// Syntax-check every inline script.
for (const m of app.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Function(m[1]);

const cut = app.indexOf("<section");
const headPart = app.slice(0, cut);
const bodyPart = app.slice(cut);

const index = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Jota">
<meta name="theme-color" content="#131313">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="icon" href="icons/icon-192.png">
<style>
html { box-sizing: border-box; padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }
body { margin: 0; }
[hidden] { display: none !important; }
</style>
${headPart.trim()}
</head>
<body>
${bodyPart.trim()}
<script>
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js"));
}
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(ROOT, "index.html"), index);

const version = crypto.createHash("sha1").update(index).digest("hex").slice(0, 10);
const sw = read("sw.template.js").replace("__VERSION__", version);
fs.writeFileSync(path.join(ROOT, "sw.js"), sw);

if (process.argv[2]) fs.writeFileSync(process.argv[2], app);
console.log(`Built index.html (${index.length} bytes, ${words.length} words), sw.js version ${version}`);
