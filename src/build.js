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
// Front-code the bonus word list (common words that are not puzzle answers).
const common = new Set(words);
let prev = "", packed = "";
for (const w of read("bonus.txt").split(/\s+/).filter(Boolean)) {
  if (common.has(w)) continue;
  let k = 0;
  while (k < 9 && k < prev.length && prev[k] === w[k]) k++;
  packed += k + w.slice(k);
  prev = w;
}
const app = read("app.src.html")
  .replace('"__WORDS__"', () => JSON.stringify(words.join(" ")))
  .replace('"__DICT__"', () => JSON.stringify(packed))
  .replace('"__SHORT__"', () => JSON.stringify(read("short.txt").split(/\s+/).filter(Boolean).join(" ")))
  .replace("__GEN__", () => gen)
  .replace("__BUILD__", () => new Date().toLocaleString("en-US", { timeZone: "America/Denver", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }));

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
<div class="update-bar" id="updateBar" hidden>
  <span>New version available</span>
  <button type="button" id="updateBtn">Update</button>
</div>
<script>
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hadController) document.getElementById("updateBar").hidden = false;
  });
  document.getElementById("updateBtn").addEventListener("click", () => location.reload());
  addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").then((reg) => {
      // Check for a new version whenever the app comes back to the foreground.
      document.addEventListener("visibilitychange", () => { if (!document.hidden) reg.update().catch(() => {}); });
    });
  });
}
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(ROOT, "index.html"), index);

// Version covers everything the app caches, so changing an icon also ships an update.
const hash = crypto.createHash("sha1").update(index);
for (const f of ["manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"]) hash.update(fs.readFileSync(path.join(ROOT, f)));
const version = hash.digest("hex").slice(0, 10);
const sw = read("sw.template.js").replace("__VERSION__", version);
fs.writeFileSync(path.join(ROOT, "sw.js"), sw);

if (process.argv[2]) fs.writeFileSync(process.argv[2], app);
console.log(`Built index.html (${index.length} bytes, ${words.length} words), sw.js version ${version}`);
