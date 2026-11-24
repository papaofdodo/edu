const SCOPE = self.registration.scope;
const CACHE_PREFIX = `math-lab:${SCOPE}:`;
const CACHE_NAME = `${CACHE_PREFIX}1`;
const INDEX_URL = new URL('index.html', SCOPE).href;
const MANIFEST_URL = new URL('manifest.json', SCOPE).href;
const RANKINGS_URL = new URL('rankings.json', SCOPE).href;
const ICONS = ['icon-192.png', 'icon-512.png'].map(path => new URL(path, SCOPE).href);
const P5_URL = 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.3/p5.min.js';
const STATIC_URLS = new Set([...ICONS, P5_URL]);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([INDEX_URL, MANIFEST_URL, RANKINGS_URL, ...STATIC_URLS]);
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    // 이 경로의 이전 앱 캐시에 한해서만 정리합니다.
    const legacy = 'math-lab-v18-responsive';
    if (await caches.match(ICONS[0], { cacheName: legacy })) await caches.delete(legacy);
    await self.clients.claim();
  })());
});

async function respond(request, cacheKey, networkFirst) {
  const cache = await caches.open(CACHE_NAME).catch(() => null);
  const readCache = () => cache?.match(cacheKey).catch(() => undefined);
  if (!networkFirst) {
    const cached = await readCache();
    if (cached) return cached;
  }
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      await cache?.put(cacheKey, response.clone()).catch(() => {});
    } else if (networkFirst && response.status >= 500) {
      return (await readCache()) || response;
    }
    return response;
  } catch {
    return (await readCache()) || Response.error();
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  // MP3 범위 요청과 API 호출은 브라우저가 직접 처리합니다.
  if (request.method !== 'GET' || request.headers.has('range')) return;
  const url = new URL(request.url);
  url.search = '';
  if (url.href === SCOPE || url.href === INDEX_URL) {
    event.respondWith(respond(request, INDEX_URL, true));
  } else if (url.href === RANKINGS_URL || url.href === MANIFEST_URL) {
    event.respondWith(respond(request, url.href, true));
  } else if (STATIC_URLS.has(url.href)) {
    event.respondWith(respond(request, url.href, false));
  }
});
