/** @format */

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "dist");
const appJson = require(path.join(projectRoot, "app.json"));

function normalizeBasePath(value) {
  const trimmed = (value || "").trim().replace(/\/+$/, "");

  if (!trimmed || trimmed === "/") {
    return "";
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function withBase(basePath, pathname) {
  return `${basePath}${pathname}`;
}

function listDistFiles(relativeDir) {
  const startDir = path.join(distDir, relativeDir);

  if (!fs.existsSync(startDir)) {
    return [];
  }

  const files = [];
  const stack = [startDir];

  while (stack.length > 0) {
    const current = stack.pop();

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else if (entry.isFile()) {
        files.push(path.relative(distDir, entryPath).replace(/\\/g, "/"));
      }
    }
  }

  return files;
}

const basePath = normalizeBasePath(process.env.EXPO_BASE_URL);
const indexPath = path.join(distDir, "index.html");
const pwaIconPath = path.join(distDir, "pwa-icon.png");
const iconSourcePath = path.join(projectRoot, "assets", "icon.png");
const appConfig = appJson.expo;

if (!fs.existsSync(indexPath)) {
  throw new Error(
    "dist/index.html was not found. Run the Expo web export before preparing PWA assets.",
  );
}

fs.copyFileSync(iconSourcePath, pwaIconPath);

const manifest = {
  name: appConfig.name,
  short_name: "Inventory",
  description:
    "Offline-first inventory recording app for package counts and submission queues.",
  start_url: withBase(basePath, "/"),
  scope: withBase(basePath, "/"),
  display: "standalone",
  orientation: appConfig.orientation || "portrait",
  background_color: appConfig.splash?.backgroundColor || "#ffffff",
  theme_color: "#ffffff",
  icons: [
    {
      src: withBase(basePath, "/pwa-icon.png"),
      sizes: "1024x1024",
      type: "image/png",
      purpose: "any maskable",
    },
  ],
};

fs.writeFileSync(
  path.join(distDir, "manifest.webmanifest"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

fs.writeFileSync(path.join(distDir, ".nojekyll"), "");

let html = fs.readFileSync(indexPath, "utf8");

if (!html.includes('rel="manifest"')) {
  const pwaHeadTags = [
    '<meta name="theme-color" content="#ffffff" />',
    '<meta name="apple-mobile-web-app-capable" content="yes" />',
    `<link rel="manifest" href="${withBase(basePath, "/manifest.webmanifest")}" />`,
    `<link rel="apple-touch-icon" href="${withBase(basePath, "/pwa-icon.png")}" />`,
  ].join("\n    ");

  html = html.replace("</head>", `\n    ${pwaHeadTags}\n  </head>`);
}

if (!html.includes("navigator.serviceWorker.register")) {
  const registrationScript = `<script>
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("${withBase(basePath, "/sw.js")}").catch(() => undefined);
  });
}
</script>`;

  html = html.replace("</body>", `${registrationScript}\n</body>`);
}

fs.writeFileSync(indexPath, html);

const precacheAssets = Array.from(
  new Set([
    withBase(basePath, "/"),
    withBase(basePath, "/index.html"),
    withBase(basePath, "/favicon.ico"),
    withBase(basePath, "/manifest.webmanifest"),
    withBase(basePath, "/pwa-icon.png"),
    ...listDistFiles("_expo").map((file) => withBase(basePath, `/${file}`)),
    ...listDistFiles("assets").map((file) => withBase(basePath, `/${file}`)),
  ]),
);

const serviceWorker = `const CACHE_NAME = "express-luck-inventory-v1";
const BASE_PATH = ${JSON.stringify(basePath)};
const PRECACHE_ASSETS = ${JSON.stringify(precacheAssets, null, 2)};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE_PATH + "/")) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(BASE_PATH + "/index.html", copy));
          return response;
        })
        .catch(() => caches.match(BASE_PATH + "/index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }

        return response;
      });
    })
  );
});
`;

fs.writeFileSync(path.join(distDir, "sw.js"), serviceWorker);

console.log(`Prepared PWA assets for base path "${basePath || "/"}".`);
