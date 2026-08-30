// =============================================
// PWAキャッシュ
// =============================================
// service-worker.js 自体を修正したため、既存の壊れたキャッシュを更新する。
const CACHE_NAME = "kakeibo-v164";

// 実在する最低限のファイルだけを事前キャッシュする。
// src以下のJS/CSSは初回読み込み時にfetchハンドラで順次キャッシュされる。
const urlsToCache = [
  "./",
  "./index.html",
  "./manifest.json"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// ネットワーク優先。通信できない場合だけキャッシュを利用する。
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response && response.ok && new URL(request.url).origin === self.location.origin) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    } catch (_err) {
      const cached = await caches.match(request);
      if (cached) return cached;

      // ナビゲーション要求なら、オフライン時はキャッシュ済みindex.htmlへ戻す。
      if (request.mode === "navigate") {
        const fallback = await caches.match("./index.html");
        if (fallback) return fallback;
      }
      throw _err;
    }
  })());
});
