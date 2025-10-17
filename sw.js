const STATIC_CACHE = 'aac-static-v6';
const MP3_CACHE = 'aac-mp3-v1';
const MP3_CACHE_LIMIT = 30;
const STATIC_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './offline.html',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './audio/aller-aux-toilettes.mp3',
  './audio/boire.mp3',
  './audio/manger.mp3',
  './audio/mes-medicaments.mp3',
  './audio/allumer-la-tele.mp3',
  './audio/descendre.mp3',
  './audio/aller-dans-le-jardin.mp3',
  './audio/me-coucher.mp3',
  './audio/jai-mal.mp3',
  './audio/incliner-mon-fauteuil.mp3',
  './audio/un-mouchoir.mp3'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => ![STATIC_CACHE, MP3_CACHE].includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => caches.open(MP3_CACHE))
      .then((cache) => enforceCacheLimit(cache, MP3_CACHE_LIMIT))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  if (url.origin === self.location.origin && url.pathname.startsWith('/tts/')) {
    event.respondWith(cacheFirst(request, MP3_CACHE));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.origin === self.location.origin && STATIC_ASSETS.includes(getAssetKey(url))) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
});

function getAssetKey(url) {
  if (url.pathname.endsWith('/') || url.pathname === '') {
    return './';
  }
  return `.${url.pathname}`;
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
      if (cacheName === MP3_CACHE) {
        await enforceCacheLimit(cache, MP3_CACHE_LIMIT);
      }
    }
    return response;
  } catch (error) {
    if (cacheName === MP3_CACHE) {
      return new Response(null, { status: 504, statusText: 'Audio indisponible' });
    }
    throw error;
  }
}

async function networkFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  try {
    const response = await fetch(request);
    cache.put('./index.html', response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match('./index.html');
    if (cached) {
      return cached;
    }
    const offline = await cache.match('./offline.html');
    if (offline) {
      return offline;
    }
    throw error;
  }
}

async function enforceCacheLimit(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length <= maxEntries) {
    return;
  }
  const overflow = keys.length - maxEntries;
  const staleKeys = keys.slice(0, overflow);
  await Promise.all(staleKeys.map((request) => cache.delete(request)));
}
