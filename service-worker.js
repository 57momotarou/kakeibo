// =============================================
// ⚠️ GitHubにファイルをアップロードしたら
//    ここのバージョン番号を 1つ増やしてください
//    例: "kakeibo-v2" → "kakeibo-v3"
// =============================================
const CACHE_NAME = "kakeibo-v111";

const urlsToCache = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json"
];

// インストール：新しいキャッシュを作成
self.addEventListener("install", event => {
  // 古いService Workerを待たず即座に有効化
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// アクティベート：古いキャッシュを全て削除
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME) // 今のバージョン以外を削除
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim()) // 全タブに即座に適用
  );
});

// フェッチ：ネットワーク優先、失敗時はキャッシュを使用
self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 正常なレスポンスをキャッシュに保存して返す
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => {
        // オフライン時はキャッシュから返す
        return caches.match(event.request);
      })
  );
});