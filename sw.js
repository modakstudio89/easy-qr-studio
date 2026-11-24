const CACHE_NAME = "easy-qr-studio-v3";

const CORE_ASSETS = ["./", "./index.html", "./manifest.json", "./icon.svg"];
const EXTERNAL_ASSETS = [
  "https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js",
  "https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_ASSETS);
    await Promise.allSettled(EXTERNAL_ASSETS.map(async url => {
      const response = await fetch(url, { mode: "cors" });
      if (response.ok) await cache.put(url, response);
    }));
  })());
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const isNavigation = event.request.mode === "navigate" || (event.request.headers.get("accept") || "").includes("text/html");

  if (isNavigation) {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(event.request);
        const copy = networkResponse.clone();
        const cache = await caches.open(CACHE_NAME);
        await cache.put(event.request, copy);
        return networkResponse;
      } catch (_) {
        return (await caches.match("./index.html")) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response && response.status === 200) {
        const copy = response.clone();
        const cache = await caches.open(CACHE_NAME);
        await cache.put(event.request, copy);
      }
      return response;
    } catch (_) {
      return new Response("Offline", { status: 503, statusText: "Offline" });
    }
  })());
});
