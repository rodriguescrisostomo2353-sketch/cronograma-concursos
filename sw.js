// Service Worker para o PWA Cronograma de Estudos para Concursos (v1.7.4 - Performance Update)
const CACHE_NAME = 'cronograma-concursos-v23';

// Recursos essenciais para abertura instantânea offline-first (leve e não-bloqueante)
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './divisor-topicos.js',
  './study-hours.css',
  './study-hours-manager.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png'
];

// Instalação do Service Worker e pré-cache com isolamento de falhas
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Adiciona individualmente com try/catch para garantir que falhas em arquivos opcionais nunca bloqueiem a instalação
      for (const asset of PRECACHE_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn('[SW v23] Não foi possível fazer pré-cache de:', asset, err);
        }
      }
    }).then(() => self.skipWaiting())
  );
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[SW v23] Removendo cache legado:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptação de requisições: Stale-While-Revalidate com abertura instantânea offline-first
self.addEventListener('fetch', (event) => {
  // Apenas intercepta requisições GET
  if (event.request.method !== 'GET') return;

  // Nunca intercepta nem armazena em cache o version.json (verificação online em tempo real)
  if (event.request.url.includes('version.json')) return;

  // Nunca intercepta chamadas de autenticação ou banco do Supabase (tempo real)
  if (event.request.url.includes('supabase.co')) return;

  // Navegação HTML: Cache First com revalidação em background (Stale-While-Revalidate)
  // Entrega o HTML local imediatamente em 1ms sem esperar a rede
  if (event.request.mode === 'navigate' || (event.request.headers && event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) {
          fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          }).catch(() => {});
          return cached;
        }

        return caches.match('./index.html').then((indexCached) => {
          if (indexCached) {
            fetch(event.request).then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
              }
            }).catch(() => {});
            return indexCached;
          }

          return fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            }
            return networkResponse;
          });
        });
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Demais recursos estáticos: Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });

      return cachedResponse || fetchPromise;
    })
  );
});
