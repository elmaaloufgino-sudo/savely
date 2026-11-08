const CACHE = 'fyndaren-v25';

// Kontrollera att varje fil här finns på servern. En saknad fil hoppas över,
// men ger då ingen offline-support för just den filen.
const SHELL = [
  './',
  'index.html',
  'app.html',
  'manifest.webmanifest',
  'icon.svg',
  'icon-192.png',
  'icon-512.png',
  'pwa-icon-192.png',
  'pwa-icon-512.svg'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // En saknad fil får inte stoppa hela installationen.
    // cache: 'reload' hämtar färska filer, inte webbläsarens gamla kopior.
    await Promise.allSettled(
      SHELL.map(url => cache.add(new Request(url, { cache: 'reload' })))
    );
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // Radera bara äldre Fyndaren-cachar, inte andra appar på samma origin.
    await Promise.all(
      keys.filter(key => key.startsWith('fyndaren-') && key !== CACHE)
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

// Sidor sparas utan query-sträng, så ?utm=... och ?deal=... kan använda
// samma cachade HTML. Query-parametern finns fortfarande i navigerings-URL:en.
function pageKey(req) {
  const url = new URL(req.url);
  url.search = '';
  url.hash = '';
  return url.href;
}

// Sidor: nätet först. Vid nätverksfel/timeout används cachad sida.
async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  const key = pageKey(req);

  const network = fetch(req).then(response => {
    if (response.status === 200) {
      cache.put(key, response.clone()).catch(() => {});
    }
    return response;
  });

  try {
    return await Promise.race([
      network,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('network-timeout')), 4000)
      )
    ]);
  } catch (error) {
    const cachedPage = await cache.match(key);
    if (cachedPage) return cachedPage;

    // Endast navigeringar får falla tillbaka till appens HTML.
    const appShell = await cache.match(new URL('app.html', self.registration.scope).href);
    return appShell || Response.error();
  }
}

// Filer (ikoner, manifest m.m.): visa cachen direkt och uppdatera i bakgrunden.
async function staleWhileRevalidate(cachedPromise, refreshPromise) {
  const cached = await cachedPromise;
  if (cached) return cached;

  try {
    return await refreshPromise;
  } catch (error) {
    return Response.error();
  }
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;

  const url = new URL(req.url);
  // Bara våra egna filer. Databas, inloggning, typsnitt och externa skript går direkt mot nätet.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/admin.html') || url.pathname.endsWith('/sw.js')) return;

  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req));
    return;
  }

  const cachePromise = caches.open(CACHE);
  const cachedPromise = cachePromise.then(cache => cache.match(req));
  const refreshPromise = fetch(req).then(response => {
    // Bara hela, egna svar. Delsvar (206) och cross-origin-svar cachas inte.
    if (response.status === 200 && response.type === 'basic') {
      return cachePromise.then(cache =>
        cache.put(req, response.clone()).catch(() => {})
      ).then(() => response);
    }
    return response;
  });

  // waitUntil anropas synkront under fetch-eventet, inte efter en await.
  event.waitUntil(refreshPromise.catch(() => {}));
  event.respondWith(staleWhileRevalidate(cachedPromise, refreshPromise));
});
