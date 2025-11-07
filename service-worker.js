// Nama cache
const CACHE_NAME = 'PixelMore Studio';

// Daftar file yang akan di-cache
const urlsToCache = [
  './',
  'index.html',
  'manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap'
];

// Event: Install (Mencaching aset)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache and added all core assets');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Failed to cache assets:', error);
      })
  );
  self.skipWaiting();
});

// Event: Activate (Membersihkan cache lama)
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Event: Fetch (Melayani dari cache atau jaringan)
self.addEventListener('fetch', (event) => {
  // Hanya melayani permintaan GET
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - kembalikan respons dari cache
        if (response) {
          return response;
        }

        // Tidak ada di cache - buat permintaan jaringan
        return fetch(event.request).then(
          (response) => {
            // Periksa jika kita menerima respons yang valid
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Klon respons agar dapat di-cache
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                // Jangan cache permintaan Firebase / Google APIs
                if (!event.request.url.includes('firebase') && !event.request.url.includes('googleapis')) {
                    cache.put(event.request, responseToCache);
                }
              });

            return response;
          }
        ).catch(() => {
            // Fallback jika permintaan jaringan gagal dan tidak ada di cache
            return caches.match('index.html'); // Fallback ke halaman utama
        });
      })
    );
});
