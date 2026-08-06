const CACHE_NAME = 'sat-vocab-v13-one-field-autofill-20260806';
const CORE_ASSETS = ['./', './index.html', './profile.html', './profile-game.css', './app-v4.js', './profile-page.js', './cloud-config.js', './cloud-sync.js', './pdf-words.js', './manifest.json', './icon.svg', './assets/mascot/glyph-focus.png', './assets/mascot/glyph-sad.png', './assets/mascot/glyph-win.png', './assets/achievements/review-sigil.png', './assets/achievements/ten-answers.png', './assets/achievements/fifty-deep.png', './assets/achievements/century-proof.png', './assets/achievements/mastery-sigil.png', './assets/achievements/lexicon-keeper.png', './assets/achievements/streak-sigil.png', './assets/achievements/full-week.png', './assets/achievements/month-proof.png', './assets/achievements/archive-sigil.png', './assets/achievements/overclocked.png', './assets/achievements/perfect-archive.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
      return response;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok && new URL(event.request.url).origin === self.location.origin) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => caches.match(event.request)));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
    const existing = windows.find(client => 'focus' in client);
    return existing ? existing.focus() : clients.openWindow('./');
  }));
});
