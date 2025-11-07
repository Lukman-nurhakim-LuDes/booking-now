// Nama cache
const CACHE_NAME = 'PixelMore Studio';

// Daftar file yang akan di-cache
// CATATAN: URL eksternal (CDN) dihapus untuk menghindari error CORS pada Service Worker
const urlsToCache = [
	'./',
	'index.html',
	'manifest.json',
	'images/icon-192.png', // Ikon lokal
	'images/icon-512.png' // Ikon lokal
	// CDN eksternal (Tailwind, Fonts) tidak dapat di-cache karena masalah CORS/server header
];

// Event: Install (Mencaching aset)
self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME)
			.then((cache) => {
				console.log('Opened cache and added core assets');
				// Menambahkan aset yang diizinkan untuk di-cache
				return cache.addAll(urlsToCache);
			})
			.catch((error) => {
				console.error('Failed to cache core assets:', error);
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
								// Jangan cache URL eksternal (mis. CDN Tailwind) yang tidak memiliki header CORS yang sesuai.
								const url = event.request.url;
								if (!url.includes('firebase') && !url.includes('googleapis') && url.startsWith(self.location.origin)) {
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
