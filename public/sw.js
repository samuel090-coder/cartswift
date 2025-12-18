// Service Worker for Push Notifications

self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  let data = {
    title: '🔔 New Notification',
    body: 'You have a new update!',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    image: null,
    url: '/'
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        image: payload.image || null,
        url: payload.url || '/'
      };
    } catch (e) {
      console.error('Error parsing push data:', e);
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [200, 100, 200],
    data: {
      url: data.url,
      dateOfArrival: Date.now(),
      primaryKey: crypto.randomUUID()
    },
    actions: [
      { action: 'open', title: 'View' },
      { action: 'close', title: 'Dismiss' }
    ],
    requireInteraction: true,
    silent: false,
    tag: 'cartswift-notification'
  };

  // Add image if provided - ensure it's an absolute URL
  if (data.image) {
    // Make sure image URL is absolute
    const imageUrl = data.image.startsWith('http') ? data.image : self.location.origin + data.image;
    options.image = imageUrl;
    console.log('Notification image URL:', imageUrl);
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // Open new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );

  // Track click (send to server)
  if (event.notification.data?.primaryKey) {
    fetch('/api/notification-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: event.notification.data.primaryKey })
    }).catch(console.error);
  }
});

self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
});
