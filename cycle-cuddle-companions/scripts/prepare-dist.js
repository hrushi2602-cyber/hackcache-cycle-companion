import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const outputPublicDir = path.join(rootDir, ".output", "public");
const distDir = path.join(rootDir, "dist");

console.log("[prepare-dist] Synchronizing build assets to dist/ for Capacitor...");

if (!fs.existsSync(outputPublicDir)) {
  console.error("[prepare-dist] Error: .output/public does not exist. Run vite build first.");
  process.exit(1);
}

// 1. Copy .output/public to dist
fs.rmSync(distDir, { recursive: true, force: true });
fs.cpSync(outputPublicDir, distDir, { recursive: true });

// 2. Discover CSS and JS entry bundles
const assetsDir = path.join(distDir, "assets");
let cssFile = "";
let jsFile = "";

if (fs.existsSync(assetsDir)) {
  const files = fs.readdirSync(assetsDir);
  cssFile = files.find((f) => f.startsWith("styles-") && f.endsWith(".css")) || "";
  jsFile = files.find((f) => f.startsWith("index-") && f.endsWith(".js")) || "";
}

// 3. Ensure dist/index.html is a self-contained entry point for Capacitor WebView & static hosting
const htmlPath = path.join(distDir, "index.html");
let htmlContent = "";

if (fs.existsSync(htmlPath)) {
  htmlContent = fs.readFileSync(htmlPath, "utf-8");
}

if (!htmlContent.includes(jsFile) || !htmlContent.includes(cssFile)) {
  htmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Cycle Companions</title>
    <link rel="icon" href="./favicon.ico" type="image/x-icon" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Fraunces:opsz,wght@9..144,500;9..144,600&display=swap" />
    ${cssFile ? `<link rel="stylesheet" href="./assets/${cssFile}" />` : ""}
  </head>
  <body class="bg-background text-foreground antialiased selection:bg-primary/20">
    <div id="root"></div>
    ${jsFile ? `<script type="module" src="./assets/${jsFile}"></script>` : ""}
  </body>
</html>
`;
  fs.writeFileSync(htmlPath, htmlContent, "utf-8");
}

console.log(`[prepare-dist] Successfully prepared dist/ with index.html (CSS: ${cssFile}, JS: ${jsFile})`);
