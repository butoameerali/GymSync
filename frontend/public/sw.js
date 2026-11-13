// GymSync Service Worker for Web Push & Deep-Link Navigation
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// 1. Push Event: Receive and display notification
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || 'GymSync Reminder';
    const options = {
      body: payload.body || '',
      icon: payload.icon || '/favicon.svg',
      badge: '/favicon.svg',
      tag: payload.data?.type || 'gymsync-reminder',
      renotify: true,
      data: {
        link: payload.data?.link || payload.data?.url || '/notifications',
        type: payload.data?.type || 'system'
      }
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('ServiceWorker push error:', err);
  }
});

// 2. Notification Click Event: Deep Link into React app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetLink = event.notification.data?.link || '/notifications';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a GymSync browser window is already open, focus it and navigate to target deep link
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          return client.navigate(targetLink);
        }
      }
      // If no window is currently open, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetLink);
      }
    })
  );
});
