const CACHE_NAME = 'pharmasearch-v12';
const ASSETS_TO_CACHE = [
  'src/index.html?v=12',
  'src/style.css?v=12',
  'src/app.js?v=12',
  'src/data/disease_dictionary.json?v=12',
  'public/manifest.json',
  'public/icon.png'
];

// Sự kiện cài đặt Service Worker và nạp cache ban đầu
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Đang cache tài nguyên tĩnh...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Sự kiện kích hoạt và xóa bỏ các cache cũ không cần thiết
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Service Worker: Đang xóa cache cũ...', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Chiến lược Cache-First: Ưu tiên lấy từ Cache trước để tối ưu tốc độ và chạy offline
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // Nếu không có trong cache, tiến hành fetch từ internet
      return fetch(e.request).then((networkResponse) => {
        // Chỉ cache những request thành công
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        // Clone response để lưu trữ vào cache
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Trả về trang ngoại tuyến nếu không thể kết nối mạng (dành riêng cho các yêu cầu điều hướng trang)
        if (e.request.mode === 'navigate') {
          return caches.match('src/index.html', { ignoreSearch: true });
        }
      });
    })
  );
});
