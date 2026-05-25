const CACHE_NAME = 'math-lab-v14';
const ASSETS = [
  './icon-192.png',
  './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.3/p5.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// 설치: 모든 파일을 캐시에 저장
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// 활성화: 이전 캐시 삭제
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

async function networkFirst(request, fallbackUrl) {
  try {
    const res = await fetch(request);
    if (res && res.status === 200) {
      const clone = res.clone();
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, clone);
    }
    return res;
  } catch (e) {
    const cached = await caches.match(request);
    return cached || (fallbackUrl ? caches.match(fallbackUrl) : undefined);
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res && res.status === 200) {
    const clone = res.clone();
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, clone);
  }
  return res;
}

// 요청 가로채기: HTML/랭킹은 네트워크 우선, 정적 리소스는 캐시 우선
self.addEventListener('fetch', e => {
  // 오디오(.mp3) 파일은 iOS Safari의 Range Request 호환성을 위해 서비스 워커에서 가로채지 않고 직접 네트워크로 요청하게 합니다.
  if (e.request.url.endsWith('.mp3') || e.request.url.includes('bgm')) {
    return;
  }

  const url = new URL(e.request.url);
  const isNavigation = e.request.mode === 'navigate';
  const isAppShell = url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
  const isRankingData = url.pathname.endsWith('/rankings.json');
  const isManifest = url.pathname.endsWith('/manifest.json');

  if (isNavigation || isAppShell) {
    e.respondWith(networkFirst(e.request, './index.html'));
    return;
  }

  if (isRankingData || isManifest) {
    e.respondWith(networkFirst(e.request));
    return;
  }

  e.respondWith(cacheFirst(e.request));
});
