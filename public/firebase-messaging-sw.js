importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Tactical Firebase Configuration
firebase.initializeApp({
  apiKey: "AIzaSyAveixeZokoakClMBV6CJPoa3d3V5201wE",
  authDomain: "gen-lang-client-0430129528.firebaseapp.com",
  projectId: "gen-lang-client-0430129528",
  storageBucket: "gen-lang-client-0430129528.firebasestorage.app",
  messagingSenderId: "236411176275",
  appId: "1:236411176275:web:485cf91df970e6e433cda6"
});

const messaging = firebase.messaging();

// The server sends data-only messages (title, body, url) so this worker decides how
// they look and where a tap leads. Nothing is shown twice.
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  self.registration.showNotification(data.title || 'RichFit', {
    body: data.body || '',
    icon: '/icon.png',
    badge: '/icon.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' }
  });
});

// Tapping a notification opens (or focuses) the app on the right page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client) await client.navigate(url);
        return;
      }
    }
    await clients.openWindow(url);
  })());
});
