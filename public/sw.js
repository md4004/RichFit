self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { message: event.data.text() };
    }
  }
  
  const { title, message, body, icon } = data;
  
  const options = {
    body: message || body || "Tactical Update Received",
    icon: icon || '/icon.png',
    badge: '/icon.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/'
    },
    actions: [
      { action: 'open', title: 'Open RichFit' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title || "RICHFIT Update", options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const client = windows.find(c => c.focused) || windows[0];
    if (client) {
      await client.focus();
      if ('navigate' in client) await client.navigate(url);
      return;
    }
    await clients.openWindow(url);
  })());
});
